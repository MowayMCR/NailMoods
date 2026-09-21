-- P2: authoritative entitlements, useful personal Free, preserved downgrade data.
create or replace function private.effective_tier(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select tier from private.account_entitlements where user_id=p_user and status='active' and starts_at<=now() and (expires_at is null or expires_at>now())),'free')
$$;
revoke all on function private.effective_tier(uuid) from public,anon,authenticated;
create or replace function private.discovery_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.effective_tier(auth.uid()) in ('plus','pro')
$$;
create or replace function private.tier_allows(p_pro boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (not p_pro or private.effective_tier(auth.uid())='pro')
$$;
create or replace function private.require_feature(p_feature text) returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_feature in ('social','discovery','photo_projects') then
  if not private.discovery_allowed() then raise exception 'FEATURE_REQUIRES_PLUS' using errcode='42501'; end if;
 elsif p_feature='pro' then
  if not private.tier_allows(true) then raise exception 'FEATURE_REQUIRES_PRO' using errcode='42501'; end if;
 elsif p_feature='realistic' then raise exception 'FEATURE_DISABLED' using errcode='42501';
 elsif p_feature<>'personal' then raise exception 'UNKNOWN_FEATURE'; end if;
end $$;
revoke all on function private.require_feature(text) from public,anon,authenticated;
-- UI reads the effective tier; changing a JWT/local field cannot grant access.
create or replace function private.nm_capabilities() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tier text:=private.effective_tier(auth.uid());
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 return jsonb_build_object('tier',tier,'personal',true,'social',tier in ('plus','pro'),'photo_projects',tier in ('plus','pro'),'pro',tier='pro','realistic',false);
end $$;
create or replace function public.nm_capabilities() returns jsonb language sql set search_path='' as $$select private.nm_capabilities()$$;
revoke all on function private.nm_capabilities(),public.nm_capabilities() from public,anon;
grant execute on function private.nm_capabilities(),public.nm_capabilities() to authenticated;
-- Block Free public publishing and photo-project mutations while preserving reads.
create or replace function private.enforce_content_features() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.role()='authenticated' and not private.discovery_allowed() then
  if tg_table_name='inspirations' then
   if new.is_public and (tg_op='INSERT' or not old.is_public) then perform private.require_feature('discovery');end if;
   if (new.snapshot->>'intent'='photos' or new.snapshot ? 'photoSources' or new.snapshot ? 'photoInspiration') and (tg_op='INSERT' or (new.snapshot-'isPublic'-'publicTags'-'publicMediaPath') is distinct from (old.snapshot-'isPublic'-'publicTags'-'publicMediaPath')) then perform private.require_feature('photo_projects');end if;
  elsif new.visibility='public' and (tg_op='INSERT' or old.visibility<>'public') then perform private.require_feature('discovery');
  end if;
 end if;
 return new;
end $$;
revoke all on function private.enforce_content_features() from public,anon,authenticated;
create trigger content_features before insert or update on public.inspirations for each row execute function private.enforce_content_features();
create trigger content_features before insert or update on public.journal_entries for each row execute function private.enforce_content_features();
-- Notifications with a social actor are hidden on downgrade.
create policy p2_notification_plan on public.user_notifications as restrictive for select to authenticated using(actor_id is null or (select private.discovery_allowed()));
-- A quota ledger is server-owned. Realistic rendering stays disabled.
create table private.feature_usage(
 user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete cascade,
 feature text not null, period_start date not null,period_end date not null,
 current_usage integer not null default 0 check(current_usage>=0),
 primary key(user_id,feature,period_start),check(period_end>period_start)
);
alter table private.feature_usage enable row level security;
revoke all on private.feature_usage from public,anon,authenticated;
create or replace function private.nm_quota_state(p_workspace_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare tier text:=private.effective_tier(auth.uid()); lim integer:=0; used integer:=0; start_day date:=date_trunc('month',now())::date; kind text;
begin
 if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501'; end if;
 if p_workspace_id is not null then
  if not private.is_workspace_member(p_workspace_id) then raise exception 'WORKSPACE_FORBIDDEN' using errcode='42501'; end if;
  select w.kind into kind from public.workspaces w where w.id=p_workspace_id;
 end if;
 if tier='plus' then lim:=3;
 elsif tier='pro' then
  if kind='institute' then select 15+5*count(*)::int into lim from public.workspace_members where workspace_id=p_workspace_id; else lim:=null;end if;
 end if;
 select coalesce(sum(current_usage),0) into used from private.feature_usage where feature='realistic' and period_start=start_day and (case when kind='institute' then workspace_id=p_workspace_id else user_id=auth.uid() end);
 return jsonb_build_object('feature','realistic','enabled',false,'current_usage',used,'limit',lim,'period_start',start_day,'period_end',(start_day+interval '1 month')::date,'shared_pool',kind='institute');
end $$;
create function public.nm_quota_state(p_workspace_id uuid default null) returns jsonb language sql set search_path='' as $$select private.nm_quota_state(p_workspace_id)$$;
revoke all on function public.nm_quota_state(uuid),private.nm_quota_state(uuid) from public,anon;
grant execute on function public.nm_quota_state(uuid),private.nm_quota_state(uuid) to authenticated;
CREATE OR REPLACE FUNCTION private.nm_social(p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); peer uuid; rel private.social_connections; cid uuid; mid uuid; result jsonb; key text; current_read timestamptz;
begin
 perform private.require_feature('social');
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 if octet_length(p_data::text)>24000 then raise exception 'request_too_large'; end if;
 if p_action='list' then
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into result from (
 select c.id,c.status,c.requester=me as outgoing,p.id as user_id,p.username as handle,p.display_name,p.account_tier,
 (select w.public_handle from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id where w.owner_user_id=p.id and pp.is_public order by w.created_at limit 1) as pro_handle,
 (select count(*) from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id and cm.user_id=me where m.sender_id=p.id and m.created_at>coalesce(cm.last_read_at,'epoch'::timestamptz)) as unread
 from private.social_connections c join public.profiles p on p.id=case when c.requester=me then c.recipient else c.requester end
 where me in(c.requester,c.recipient) order by c.created_at desc limit 100
 ) r;return result;
 elsif p_action='request' then
 -- Resolve only currently discoverable identities on the server.
 select case when s.entity_type='user' then s.entity_id else w.owner_user_id end into peer
 from private.search_nailmoods(p_data->>'handle',null,null) s left join public.workspaces w on s.entity_type='workspace' and w.id=s.entity_id
 where lower(s.handle)=lower(trim(leading '@' from p_data->>'handle')) limit 1;
 if peer is null or peer=me then raise exception 'invalid_recipient'; end if;
 key:=least(me,peer)::text||':'||greatest(me,peer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key,0));
 select * into rel from private.social_connections where least(requester,recipient)=least(me,peer) and greatest(requester,recipient)=greatest(me,peer);
 if rel.id is null then
 insert into private.social_connections(requester,recipient) values(me,peer) returning * into rel;
 insert into public.user_notifications(user_id,kind,actor_id) values(peer,'connection_request',me);
 end if;
 -- Crossed requests remain pending: acceptance is always explicit.
 return jsonb_build_object('id',rel.id,'status',rel.status,'outgoing',rel.requester=me);
 elsif p_action in ('accept','decline','remove') then
 select * into rel from private.social_connections where id=(p_data->>'id')::uuid and me in(requester,recipient) for update;
 if rel.id is null then raise exception 'relation_unavailable' using errcode='42501'; end if;
 if p_action in ('accept','decline') and (rel.recipient<>me or rel.status<>'pending') then raise exception 'recipient_only' using errcode='42501'; end if;
 if p_action='accept' then
 update private.social_connections set status='accepted' where id=rel.id;
 insert into public.user_notifications(user_id,kind,actor_id) values(rel.requester,'connection_accepted',me);
 else delete from private.social_connections where id=rel.id; end if;
 return jsonb_build_object('ok',true);
 elsif p_action in ('open','send','history','read') then
 peer:=(p_data->>'user_id')::uuid;
 if private.effective_tier(peer) not in ('plus','pro') then raise exception 'RECIPIENT_UNAVAILABLE' using errcode='42501';end if;
 if peer is null or peer=me then raise exception 'invalid_recipient'; end if;
 key:=least(me,peer)::text||':'||greatest(me,peer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key,0));
 if not exists(select 1 from private.social_connections where least(requester,recipient)=least(me,peer) and greatest(requester,recipient)=greatest(me,peer) and status='accepted') then raise exception 'connection_required' using errcode='42501'; end if;
 select id into cid from public.conversations where pair_key=key;
 if cid is null then
 insert into public.conversations(created_by,pair_key) values(me,key) returning id into cid;
 insert into public.conversation_members(conversation_id,user_id) values(cid,me),(cid,peer);
 end if;
 if p_action='send' then
 if length(trim(coalesce(p_data->>'body',''))) not between 1 and 2000 or (p_data->>'client_id') is null then raise exception 'invalid_message'; end if;
 if (select count(*) from public.messages where sender_id=me and created_at>now()-interval '1 minute')>=30 then raise exception 'message_rate_limit'; end if;
 insert into public.messages(conversation_id,sender_id,body,client_id) values(cid,me,trim(p_data->>'body'),(p_data->>'client_id')::uuid) on conflict(sender_id,client_id) do nothing returning id into mid;
 if mid is not null then insert into public.user_notifications(user_id,kind,actor_id) values(peer,'message',me);end if;
 return jsonb_build_object('ok',true,'conversation_id',cid);
 elsif p_action='read' then
 select max(created_at) into current_read from public.messages where conversation_id=cid and created_at<=coalesce((p_data->>'through')::timestamptz,now());
 update public.conversation_members set last_read_at=greatest(last_read_at,current_read) where conversation_id=cid and user_id=me;
 update public.user_notifications set read_at=now() where user_id=me and actor_id=peer and kind in ('message','inspiration') and read_at is null and created_at<=current_read;
 return jsonb_build_object('ok',true);
 end if;
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into result from (
 select m.id,m.body,m.sender_id=me as mine,m.created_at,s.snapshot as share from public.messages m left join public.inspiration_shares s on s.id=m.share_id and me in(s.sender_id,s.recipient_id) where m.conversation_id=cid and (p_data->>'before' is null or (m.created_at,m.id)<((p_data->>'before')::timestamptz,coalesce((p_data->>'before_id')::uuid,'00000000-0000-0000-0000-000000000000'::uuid))) order by m.created_at desc,m.id desc limit 40
 )r;
 return jsonb_build_object('conversation_id',cid,'messages',result);
 else raise exception 'unknown_action'; end if;
end $function$
;
CREATE OR REPLACE FUNCTION private.received_nailmoods_po_shares()
 RETURNS TABLE(id uuid, sender_handle text, snapshot jsonb, status text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select s.id,p.username,s.snapshot,s.status,s.created_at from public.inspiration_shares s left join public.profiles p on p.id=s.sender_id where private.tier_allows(true) and s.recipient_id=auth.uid() and private.effective_tier(s.sender_id) in ('plus','pro') and exists(select 1 from private.social_connections c where c.status='accepted' and least(c.requester,c.recipient)=least(s.sender_id,s.recipient_id) and greatest(c.requester,c.recipient)=greatest(s.sender_id,s.recipient_id)) order by s.created_at desc limit 100
$function$
;
CREATE OR REPLACE FUNCTION private.search_nailmoods(p_query text, p_kind text, p_city text)
 RETURNS TABLE(entity_type text, entity_id uuid, handle text, display_name text, kind text, avatar_url text, city text, bio text, styles text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 with request as (
 select lower(trim(leading '@' from trim(p_query))) as q,
 exists(select 1 from public.profiles where id=auth.uid() and account_tier='pro') as is_pro
 where private.discovery_allowed() and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and length(trim(p_query)) between 2 and 80
 ), visible as (
 select 'user'::text as entity_type,p.id as entity_id,p.username as handle,p.display_name,
 case when p.account_tier='pro' then coalesce(p.professional_status,'independent') else 'plus' end::text as kind,
 p.avatar_url,null::text as city,null::text as bio,array[]::text[] as styles
 from public.profiles p cross join request r where private.effective_tier(p.id) in ('plus','pro') and p.username is not null
 and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and r.is_pro))
 union all
 select 'workspace',w.id,w.public_handle,pp.display_name,
 case w.kind when 'pro' then 'independent' else w.kind end,
 pp.avatar_url,pp.city,pp.bio,pp.styles
 from public.pro_profiles pp join public.workspaces w on w.id=pp.workspace_id join public.profiles owner on owner.id=w.owner_user_id
 where pp.is_public and w.public_handle is not null and w.kind in ('pro','institute','creator') and private.effective_tier(owner.id)='pro'
 )
 select v.* from visible v cross join request r
 where (position(r.q in lower(v.handle))>0 or position(r.q in lower(v.display_name))>0)
 and (p_kind is null or v.kind=p_kind) and (p_city is null or position(lower(p_city) in lower(coalesce(v.city,'')))>0)
 order by case when lower(v.handle)=r.q then 0 when starts_with(lower(v.handle),r.q) then 1 when lower(v.display_name)=r.q then 2 else 3 end,v.display_name,v.entity_id limit 30
$function$
;
