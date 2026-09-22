-- Exact replacements of audited Recette functions. Existing privileges are preserved.
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
 if p_action='recipients' then
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into result from (
 select c.id,c.status,p.id user_id,p.username handle,p.display_name,private.effective_tier(p.id) account_tier,
 case when private.effective_tier(p.id)='pro' then case when p.professional_status='independent' then 'PO' else 'Pro' end else 'Plus' end profile_type,
 case when p.avatar_url is not null and p.discovery_visibility='everyone' then p.username end avatar_handle,
 coalesce((select jsonb_agg(jsonb_build_object('entity_id',w.id,'pro_handle',w.public_handle,'workspace_name',pp.display_name) order by w.created_at,w.id)
 from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id
 where w.owner_user_id=p.id and pp.user_id=p.id and w.kind in ('pro','institute') and private.effective_tier(p.id)='pro'),'[]') workspaces
 from private.social_connections c join public.profiles p on p.id=case when c.requester=me then c.recipient else c.requester end
 join auth.users u on u.id=p.id and u.email_confirmed_at is not null
 where me in(c.requester,c.recipient) and c.status='accepted' and not private.nm_blocked(p.id) and private.effective_tier(p.id) in ('plus','pro')
 order by lower(coalesce(nullif(p.display_name,''),p.username)),p.id
 )r;return result;
 elsif p_action='list' then
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into result from (
 select c.id,c.status,c.requester=me as outgoing,p.id as user_id,p.username as handle,p.display_name,p.account_tier,
 (select w.public_handle from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id where w.owner_user_id=p.id and pp.is_public order by w.created_at limit 1) as pro_handle,
 (select count(*) from public.messages m join public.conversation_members cm on cm.conversation_id=m.conversation_id and cm.user_id=me where m.sender_id=p.id and m.created_at>coalesce(cm.last_read_at,'epoch'::timestamptz)) as unread
 from private.social_connections c join public.profiles p on p.id=case when c.requester=me then c.recipient else c.requester end
 where me in(c.requester,c.recipient) and not private.nm_blocked(p.id) order by c.created_at desc limit 100
 ) r;return result;
 elsif p_action='request' then
 -- Resolve only currently discoverable identities on the server.
 select case when s.entity_type='user' then s.entity_id else w.owner_user_id end into peer
 from private.search_nailmoods(p_data->>'handle',null,null) s left join public.workspaces w on s.entity_type='workspace' and w.id=s.entity_id
 where lower(s.handle)=lower(trim(leading '@' from p_data->>'handle')) limit 1;
 if peer is null or peer=me then raise exception 'invalid_recipient'; end if;
 key:=least(me,peer)::text||':'||greatest(me,peer)::text;
 perform pg_advisory_xact_lock(hashtextextended(key,0));
 if private.nm_blocked(peer) then raise exception 'connection_unavailable' using errcode='42501';end if;
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
 peer:=case when rel.requester=me then rel.recipient else rel.requester end;
 perform pg_advisory_xact_lock(hashtextextended(least(me,peer)::text||':'||greatest(me,peer)::text,0));
 if private.nm_blocked(peer) then raise exception 'connection_unavailable' using errcode='42501';end if;
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
 if private.nm_blocked(peer) then raise exception 'connection_unavailable' using errcode='42501';end if;
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
 select m.id,m.share_id,m.body,m.sender_id=me as mine,m.created_at,s.snapshot as share from public.messages m left join public.inspiration_shares s on s.id=m.share_id and me in(s.sender_id,s.recipient_id) where m.conversation_id=cid and (p_data->>'before' is null or (m.created_at,m.id)<((p_data->>'before')::timestamptz,coalesce((p_data->>'before_id')::uuid,'00000000-0000-0000-0000-000000000000'::uuid))) order by m.created_at desc,m.id desc limit 40
 )r;
 return jsonb_build_object('conversation_id',cid,'messages',result);
 else raise exception 'unknown_action'; end if;
end $function$
;
CREATE OR REPLACE FUNCTION private.discovery_visible(p_owner uuid, p_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.discovery_allowed() and not private.nm_blocked(p_owner) and exists(select 1 from public.profiles p where p.id=p_owner and private.effective_tier(p.id) in ('plus','pro') and (
 (p.username is not null and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and private.tier_allows(true))))
 or (private.effective_tier(p.id)='pro' and exists(select 1 from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id where w.id=p_workspace and w.owner_user_id=p.id and pp.is_public and w.public_handle is not null))));
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
 from public.profiles p cross join request r where private.effective_tier(p.id) in ('plus','pro') and not private.nm_blocked(p.id) and p.username is not null
 and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and r.is_pro))
 union all
 select 'workspace',w.id,w.public_handle,pp.display_name,
 case w.kind when 'pro' then 'independent' else w.kind end,
 pp.avatar_url,pp.city,pp.bio,pp.styles
 from public.pro_profiles pp join public.workspaces w on w.id=pp.workspace_id join public.profiles owner on owner.id=w.owner_user_id
 where not private.nm_blocked(owner.id) and pp.is_public and w.public_handle is not null and w.kind in ('pro','institute','creator') and private.effective_tier(owner.id)='pro'
 )
 select v.* from visible v cross join request r
 where (position(r.q in lower(v.handle))>0 or position(r.q in lower(v.display_name))>0)
 and (p_kind is null or v.kind=p_kind) and (p_city is null or position(lower(p_city) in lower(coalesce(v.city,'')))>0)
 order by case when lower(v.handle)=r.q then 0 when starts_with(lower(v.handle),r.q) then 1 when lower(v.display_name)=r.q then 2 else 3 end,v.display_name,v.entity_id limit 30
$function$
;
CREATE OR REPLACE FUNCTION private.get_public_profile(p_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; normalized_handle text:=lower(trim(leading '@' from trim(p_handle)));
begin
 if not private.discovery_allowed() then raise exception 'plus_or_pro_required' using errcode='42501';end if;
  select jsonb_build_object(
    'displayName',p.display_name,
    'handle',p.username,
    'accountType',case when private.effective_tier(p.id)='pro' then coalesce(p.professional_status,'independent') else private.effective_tier(p.id) end,
    'avatarHandle',p.username,
    'bio',pp.bio,
    'city',pp.city,
    'styles',coalesce(pp.styles,'{}'::text[]),
    'journal',coalesce((select jsonb_agg(jsonb_build_object(
      'id',j.id,'performedOn',j.performed_on,'mediaId',j.id,'mood',j.snapshot->'mood',
      'tags',coalesce(j.snapshot->'publicTags','{}'),'preview',private.discovery_preview(j.snapshot->'idea'),'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.created_by=p.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'tags',coalesce(i.snapshot->'publicTags','{}'),'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',private.discovery_preview(i.snapshot)
    ) order by i.created_at desc)
      from public.inspirations i where i.created_by=p.id and i.is_public),'[]'::jsonb)
  ) into result
  from public.profiles p
  left join lateral (
    select owned.* from public.pro_profiles owned
    join public.workspaces w on w.id=owned.workspace_id
    where owned.user_id=p.id and owned.is_public
    order by case w.kind when 'pro' then 0 when 'institute' then 1 else 2 end,owned.created_at
    limit 1
  ) pp on true
  where not private.nm_blocked(p.id) and p.username=normalized_handle and private.effective_tier(p.id) in ('plus','pro') and (
    p.discovery_visibility='everyone'
    or (p.discovery_visibility='pros' and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and private.effective_tier(viewer.id)='pro'))
  );
  if result is not null then return result; end if;

  select jsonb_build_object(
    'displayName',pp.display_name,
    'handle',w.public_handle,
    'accountType',case w.kind when 'pro' then 'independent' else w.kind end,
    'avatarHandle',w.public_handle,
    'bio',pp.bio,
    'city',pp.city,
    'styles',coalesce(pp.styles,'{}'::text[]),
    'journal',coalesce((select jsonb_agg(jsonb_build_object(
      'id',j.id,'performedOn',j.performed_on,'mediaId',j.id,'mood',j.snapshot->'mood',
      'tags',coalesce(j.snapshot->'publicTags','{}'),'preview',private.discovery_preview(j.snapshot->'idea'),'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.workspace_id=w.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'tags',coalesce(i.snapshot->'publicTags','{}'),'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',private.discovery_preview(i.snapshot)
    ) order by i.created_at desc)
      from public.inspirations i where i.workspace_id=w.id and i.is_public),'[]'::jsonb)
  ) into result
  from public.workspaces w
  join public.pro_profiles pp on pp.workspace_id=w.id and pp.is_public
  join public.profiles owner on owner.id=w.owner_user_id and private.effective_tier(owner.id)='pro'
  where not private.nm_blocked(w.owner_user_id) and w.public_handle=normalized_handle and w.kind in ('pro','institute','creator');
  return result;
end $function$
;
CREATE OR REPLACE FUNCTION private.nm_media_access(p_kind text, p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare owner_id uuid; workspace uuid; is_public boolean;
begin
 if auth.uid() is null then return false;end if;
 if p_kind='journal' then select created_by,workspace_id,visibility='public' into owner_id,workspace,is_public from public.journal_entries where id=p_id;
 elsif p_kind='inspiration' then select created_by,workspace_id,i.is_public into owner_id,workspace,is_public from public.inspirations i where id=p_id;
 else return false;end if;
 if private.nm_blocked(owner_id) then return false;end if;
 if owner_id is null then return false;end if;
 if exists(select 1 from public.workspace_members where workspace_id=workspace and user_id=auth.uid()) and (owner_id=auth.uid() or private.discovery_allowed()) then return true;end if;
 return is_public and private.discovery_visible(owner_id,workspace);
end $function$
;
CREATE OR REPLACE FUNCTION private.nm_share_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.inspiration_shares;
begin
 perform private.require_feature('social');
 select * into s from public.inspiration_shares where id=p_id and auth.uid() in(sender_id,recipient_id);
 if private.nm_blocked(case when s.sender_id=auth.uid() then s.recipient_id else s.sender_id end) or s.id is null or private.effective_tier(s.sender_id) not in ('plus','pro') or private.effective_tier(s.recipient_id) not in ('plus','pro') or not exists(select 1 from private.social_connections c where c.status='accepted' and least(c.requester,c.recipient)=least(s.sender_id,s.recipient_id) and greatest(c.requester,c.recipient)=greatest(s.sender_id,s.recipient_id)) then raise exception 'SHARE_UNAVAILABLE' using errcode='42501';end if;
 if s.snapshot ? 'public_reference' then
 return s.snapshot || jsonb_build_object('publication',private.nm_discover('detail',s.snapshot->'public_reference'));
 end if;
 return s.snapshot;
end $function$
;
CREATE OR REPLACE FUNCTION private.received_nailmoods_po_shares()
 RETURNS TABLE(id uuid, sender_handle text, snapshot jsonb, status text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select s.id,p.username,s.snapshot,s.status,s.created_at from public.inspiration_shares s left join public.profiles p on p.id=s.sender_id where not private.nm_blocked(s.sender_id) and private.tier_allows(true) and s.recipient_id=auth.uid() and private.effective_tier(s.sender_id) in ('plus','pro') and exists(select 1 from private.social_connections c where c.status='accepted' and least(c.requester,c.recipient)=least(s.sender_id,s.recipient_id) and greatest(c.requester,c.recipient)=greatest(s.sender_id,s.recipient_id)) order by s.created_at desc limit 100
$function$
;
CREATE OR REPLACE FUNCTION private.share_product(p jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
 select jsonb_build_object('name',left(p->>'name',120),'brand',left(p->>'brand',120),'collection',left(p->>'collection',120),'reference',left(p->>'reference',120),'barcode',left(p->>'barcode',120),'catalogId',left(p->>'catalogId',120),'type',left(p->>'type',40),'color',case when p->>'color' ~* '^#[0-9a-f]{6}$' then p->>'color' end)
$function$
;