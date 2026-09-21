alter table public.inspiration_shares add column sender_id uuid references auth.users(id) on delete cascade;
alter table public.inspiration_shares add column recipient_id uuid references auth.users(id) on delete cascade;
update public.inspiration_shares set sender_id=shared_by,recipient_id=shared_with;
alter table public.inspiration_shares alter column inspiration_id drop not null;
alter table public.messages alter column body drop not null;
create function private.align_share_columns() returns trigger language plpgsql set search_path='' as $$begin
 new.sender_id:=coalesce(new.sender_id,new.shared_by);new.recipient_id:=coalesce(new.recipient_id,new.shared_with);
 new.shared_by:=new.sender_id;new.shared_with:=new.recipient_id;return new;end$$;
revoke all on function private.align_share_columns() from public,anon,authenticated;
create trigger align_share_columns before insert or update on public.inspiration_shares for each row execute function private.align_share_columns();
-- Recette: private inspiration/journal request sent to a professional workspace.
alter table public.inspiration_shares add column if not exists recipient_workspace_id uuid references public.workspaces on delete cascade;
alter table public.inspiration_shares add column if not exists source_local_id text;
alter table public.inspiration_shares add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table public.inspiration_shares add column if not exists status text not null default 'sent' check(status in ('sent','opened','archived'));
create index if not exists inspiration_shares_recipient_created on public.inspiration_shares(recipient_id,created_at desc);
create index if not exists inspiration_shares_recipient_workspace on public.inspiration_shares(recipient_workspace_id);

create or replace function private.send_nailmoods_share_to_po(p_recipient_workspace_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare recipient uuid; share_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 select w.owner_user_id into recipient from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join public.profiles p on p.id=w.owner_user_id where w.id=p_recipient_workspace_id and w.kind in ('pro','institute','creator') and pp.is_public and p.account_tier='pro';
 if recipient is null or recipient=auth.uid() then raise exception 'invalid_po_recipient' using errcode='22023'; end if;
 if jsonb_typeof(p_snapshot)<>'object' or length(p_snapshot::text)>20000 or p_snapshot ?| array['notes','photo','image','message','prompt','email','address'] then raise exception 'invalid_share_snapshot' using errcode='22023'; end if;
 insert into public.inspiration_shares(inspiration_id,sender_id,recipient_id,recipient_workspace_id,source_local_id,snapshot) values(null,auth.uid(),recipient,p_recipient_workspace_id,left(p_source_local_id,120),p_snapshot) returning id into share_id;
 return share_id;
end $$;
create or replace function private.received_nailmoods_po_shares() returns table(id uuid,sender_handle text,snapshot jsonb,status text,created_at timestamptz) language sql stable security definer set search_path='' as $$
 select s.id,p.username,s.snapshot,s.status,s.created_at from public.inspiration_shares s left join public.profiles p on p.id=s.sender_id where s.recipient_id=auth.uid() order by s.created_at desc limit 100
$$;
revoke all on function private.send_nailmoods_share_to_po(uuid,text,jsonb),private.received_nailmoods_po_shares() from public,anon;
grant execute on function private.send_nailmoods_share_to_po(uuid,text,jsonb),private.received_nailmoods_po_shares() to authenticated;
create or replace function public.send_nailmoods_share_to_po(p_recipient_workspace_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language sql security invoker set search_path='' as $$select private.send_nailmoods_share_to_po(p_recipient_workspace_id,p_source_local_id,p_snapshot)$$;
create or replace function public.received_nailmoods_po_shares() returns table(id uuid,sender_handle text,snapshot jsonb,status text,created_at timestamptz) language sql security invoker set search_path='' as $$select * from private.received_nailmoods_po_shares()$$;
revoke all on function public.send_nailmoods_share_to_po(uuid,text,jsonb),public.received_nailmoods_po_shares() from public,anon;
grant execute on function public.send_nailmoods_share_to_po(uuid,text,jsonb),public.received_nailmoods_po_shares() to authenticated;
-- Recette only. Additive, no changes to collection/workspace access policies.
create table private.social_connections (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references auth.users on delete cascade,
 recipient uuid not null references auth.users on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester<>recipient)
);
create unique index social_connection_pair on private.social_connections(least(requester,recipient),greatest(requester,recipient));
create index social_connection_recipient on private.social_connections(recipient);
create index social_connection_requester on private.social_connections(requester);
alter table private.social_connections enable row level security;
revoke all on private.social_connections from public,anon,authenticated;
alter table public.conversations add column if not exists pair_key text;
create unique index social_conversation_pair on public.conversations(pair_key);
create index if not exists social_message_page on public.messages(conversation_id,created_at desc,id);
create index if not exists social_member_user on public.conversation_members(user_id);
alter table public.messages add column if not exists client_id uuid;
create unique index social_message_retry on public.messages(sender_id,client_id);

create function private.nm_social(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; rel private.social_connections; cid uuid; mid uuid; result jsonb; key text; current_read timestamptz;
begin
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
 insert into public.user_notifications(user_id,kind) values(peer,'message_request');
 end if;
 -- Crossed requests remain pending: acceptance is always explicit.
 return jsonb_build_object('id',rel.id,'status',rel.status,'outgoing',rel.requester=me);
 elsif p_action in ('accept','decline','remove') then
 select * into rel from private.social_connections where id=(p_data->>'id')::uuid and me in(requester,recipient) for update;
 if rel.id is null then raise exception 'relation_unavailable' using errcode='42501'; end if;
 if p_action in ('accept','decline') and (rel.recipient<>me or rel.status<>'pending') then raise exception 'recipient_only' using errcode='42501'; end if;
 if p_action='accept' then
 update private.social_connections set status='accepted' where id=rel.id;
 insert into public.user_notifications(user_id,kind) values(rel.requester,'message_request');
 else delete from private.social_connections where id=rel.id; end if;
 return jsonb_build_object('ok',true);
 elsif p_action in ('open','send','history','read') then
 peer:=(p_data->>'user_id')::uuid;
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
 if mid is not null then insert into public.user_notifications(user_id,kind) values(peer,'message');end if;
 return jsonb_build_object('ok',true,'conversation_id',cid);
 elsif p_action='read' then
 update public.conversation_members set last_read_at=now() where conversation_id=cid and user_id=me;
 return jsonb_build_object('ok',true);
 end if;
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into result from (
 select id,body,sender_id=me as mine,created_at from public.messages where conversation_id=cid and (p_data->>'before' is null or created_at<(p_data->>'before')::timestamptz) order by created_at desc,id desc limit 40
 )r;
 return jsonb_build_object('conversation_id',cid,'messages',result);
 else raise exception 'unknown_action'; end if;
end $$;
revoke all on function private.nm_social(text,jsonb) from public,anon;
grant execute on function private.nm_social(text,jsonb) to authenticated;
create function public.nm_social(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.nm_social(p_action,p_data)$$;
revoke all on function public.nm_social(text,jsonb) from public,anon;
grant execute on function public.nm_social(text,jsonb) to authenticated;
alter table public.messages add column share_id uuid references public.inspiration_shares on delete set null;
create index social_message_share on public.messages(share_id);
create or replace function private.send_nailmoods_share_to_po(p_recipient_workspace_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare recipient uuid; sid uuid; cid uuid; payload jsonb;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 select w.owner_user_id into recipient from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join public.profiles p on p.id=w.owner_user_id where w.id=p_recipient_workspace_id and pp.is_public and p.account_tier='pro';
 -- The open RPC performs the definitive pair authorization and locking.
 cid:=(private.nm_social('open',jsonb_build_object('user_id',recipient))->>'conversation_id')::uuid;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or octet_length(p_snapshot::text)>20000 then raise exception 'invalid_share';end if;
 -- Explicit allowlist; no photos, notes, prompts or arbitrary URLs.
 payload:=jsonb_build_object('title',left(p_snapshot->>'title',120),'source_type',case when p_snapshot->>'source_type'='journal' then 'journal' else 'inspiration' end,'colors',coalesce(p_snapshot->'colors','[]'),'techniques',coalesce(p_snapshot->'techniques','[]'),'requirements',coalesce(p_snapshot->'requirements','[]'),'level',left(p_snapshot->>'level',40),'mood',left(p_snapshot->>'mood',80));
 if jsonb_typeof(payload->'colors')<>'array' or jsonb_array_length(payload->'colors')>5 or exists(select 1 from jsonb_array_elements_text(payload->'colors') c where c!~*'^#[0-9a-f]{6}$') then raise exception 'invalid_palette';end if;
 if jsonb_typeof(payload->'techniques')<>'array' or jsonb_typeof(payload->'requirements')<>'array' then raise exception 'invalid_requirements';end if;
 insert into public.inspiration_shares(sender_id,recipient_id,recipient_workspace_id,source_local_id,snapshot) values(auth.uid(),recipient,p_recipient_workspace_id,left(p_source_local_id,120),payload) returning id into sid;
 insert into public.messages(conversation_id,sender_id,share_id) values(cid,auth.uid(),sid);
 insert into public.user_notifications(user_id,kind) values(recipient,'inspiration');
 return sid;
end $$;
create or replace function private.nm_social(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; rel private.social_connections; cid uuid; mid uuid; result jsonb; key text; current_read timestamptz;
begin
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
 insert into public.user_notifications(user_id,kind) values(peer,'message_request');
 end if;
 -- Crossed requests remain pending: acceptance is always explicit.
 return jsonb_build_object('id',rel.id,'status',rel.status,'outgoing',rel.requester=me);
 elsif p_action in ('accept','decline','remove') then
 select * into rel from private.social_connections where id=(p_data->>'id')::uuid and me in(requester,recipient) for update;
 if rel.id is null then raise exception 'relation_unavailable' using errcode='42501'; end if;
 if p_action in ('accept','decline') and (rel.recipient<>me or rel.status<>'pending') then raise exception 'recipient_only' using errcode='42501'; end if;
 if p_action='accept' then
 update private.social_connections set status='accepted' where id=rel.id;
 insert into public.user_notifications(user_id,kind) values(rel.requester,'message_request');
 else delete from private.social_connections where id=rel.id; end if;
 return jsonb_build_object('ok',true);
 elsif p_action in ('open','send','history','read') then
 peer:=(p_data->>'user_id')::uuid;
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
 if mid is not null then insert into public.user_notifications(user_id,kind) values(peer,'message');end if;
 return jsonb_build_object('ok',true,'conversation_id',cid);
 elsif p_action='read' then
 update public.conversation_members set last_read_at=now() where conversation_id=cid and user_id=me;
 return jsonb_build_object('ok',true);
 end if;
 select coalesce(jsonb_agg(row_to_json(r)),'[]') into result from (
 select m.id,m.body,m.sender_id=me as mine,m.created_at,s.snapshot as share from public.messages m left join public.inspiration_shares s on s.id=m.share_id and me in(s.sender_id,s.recipient_id) where m.conversation_id=cid and (p_data->>'before' is null or m.created_at<(p_data->>'before')::timestamptz) order by m.created_at desc,m.id desc limit 40
 )r;
 return jsonb_build_object('conversation_id',cid,'messages',result);
 else raise exception 'unknown_action'; end if;
end $$;
create table private.social_favorites(user_id uuid references auth.users on delete cascade,kind text check(kind in ('inspiration','journal')),entity_id uuid not null,created_at timestamptz default now(),primary key(user_id,kind,entity_id));
alter table private.social_favorites enable row level security;
revoke all on private.social_favorites from public,anon,authenticated;
create function private.nm_discover(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();result jsonb; item jsonb;
begin
 if me is null then raise exception 'authentication_required' using errcode='42501';end if;
 if p_action='remove' then delete from private.social_favorites where user_id=me and kind=p_data->>'kind' and entity_id=(p_data->>'id')::uuid; return '{"ok":true}';end if;
 with contents as (
 select 'inspiration'::text kind,i.id,i.created_by owner,i.title,i.mood,i.snapshot,i.created_at from public.inspirations i where i.is_public
 union all select 'journal',j.id,j.created_by,j.snapshot->>'title',j.snapshot->>'mood',j.snapshot,j.created_at from public.journal_entries j where j.visibility='public'
 ), visible as (
 select c.*,p.username handle from contents c join public.profiles p on p.id=c.owner where p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and exists(select 1 from public.profiles where id=me and account_tier='pro'))
 ), page as (
 select v.kind,v.id,v.title,v.mood,v.handle,v.created_at,
 exists(select 1 from private.social_favorites f where f.user_id=me and f.kind=v.kind and f.entity_id=v.id) as saved
 from visible v where
 (p_action<>'add' or (v.id=(p_data->>'id')::uuid and v.kind=p_data->>'kind'))
 and (p_action<>'favorites' or exists(select 1 from private.social_favorites f where f.user_id=me and f.kind=v.kind and f.entity_id=v.id))
 and (coalesce(p_data->>'query','')='' or concat_ws(' ',v.title,v.mood,v.handle) ilike '%'||left(p_data->>'query',80)||'%')
 order by v.created_at desc,v.id limit 20 offset least(greatest(coalesce((p_data->>'offset')::int,0),0),10000)
 ) select coalesce(jsonb_agg(row_to_json(page)),'[]') into result from page;
 if p_action='add' then if jsonb_array_length(result)=0 then raise exception 'content_unavailable';end if;insert into private.social_favorites(user_id,kind,entity_id) values(me,p_data->>'kind',(p_data->>'id')::uuid) on conflict do nothing;return '{"ok":true}';end if;
 if p_action not in ('discover','favorites') then raise exception 'unknown_action';end if;
 return result;
end $$;
revoke all on function private.nm_discover(text,jsonb) from public,anon;
grant execute on function private.nm_discover(text,jsonb) to authenticated;
create function public.nm_discover(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.nm_discover(p_action,p_data)$$;
revoke all on function public.nm_discover(text,jsonb) from public,anon;
grant execute on function public.nm_discover(text,jsonb) to authenticated;
create or replace function private.send_nailmoods_share_to_po(p_recipient_workspace_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare recipient uuid; sid uuid; cid uuid; payload jsonb;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 select w.owner_user_id into recipient from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join public.profiles p on p.id=w.owner_user_id where w.id=p_recipient_workspace_id and pp.is_public and p.account_tier='pro';
 -- The open RPC performs the definitive pair authorization and locking.
 cid:=(private.nm_social('open',jsonb_build_object('user_id',recipient))->>'conversation_id')::uuid;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or octet_length(p_snapshot::text)>20000 then raise exception 'invalid_share';end if;
 -- Explicit allowlist; no photos, notes, prompts or arbitrary URLs.
 payload:=jsonb_build_object('title',left(p_snapshot->>'title',120),'source_type',case when p_snapshot->>'source_type'='journal' then 'journal' else 'inspiration' end,'colors',coalesce(p_snapshot->'colors','[]'),'techniques',coalesce(p_snapshot->'techniques','[]'),'requirements',coalesce(p_snapshot->'requirements','[]'),'level',left(p_snapshot->>'level',40),'mood',left(p_snapshot->>'mood',80));
 if jsonb_typeof(payload->'colors')<>'array' or jsonb_array_length(payload->'colors')>5 or exists(select 1 from jsonb_array_elements_text(payload->'colors') c where c!~*'^#[0-9a-f]{6}$') then raise exception 'invalid_palette';end if;
 if jsonb_typeof(payload->'techniques')<>'array' or jsonb_typeof(payload->'requirements')<>'array' then raise exception 'invalid_requirements';end if;
 if jsonb_array_length(payload->'techniques')>8 or jsonb_array_length(payload->'requirements')>12 or exists(select 1 from jsonb_array_elements((payload->'techniques')||(payload->'requirements')) e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>120) then raise exception 'invalid_share_labels';end if;
 insert into public.inspiration_shares(sender_id,recipient_id,recipient_workspace_id,source_local_id,snapshot) values(auth.uid(),recipient,p_recipient_workspace_id,left(p_source_local_id,120),payload) returning id into sid;
 insert into public.messages(conversation_id,sender_id,share_id) values(cid,auth.uid(),sid);
 insert into public.user_notifications(user_id,kind) values(recipient,'inspiration');
 return sid;
end $$;
CREATE OR REPLACE FUNCTION private.record_privacy_choices(p_privacy_version text, p_terms_version text, p_accept_terms boolean, p_confirm_adult boolean, p_analytics_consent boolean, p_ads_consent boolean, p_personalized_ads_consent boolean)
 RETURNS user_consents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  previous public.user_consents;
  result public.user_consents;
  needs_terms boolean;
  needs_adult boolean;
begin
  if current_user_id is null
     or not exists(select 1 from auth.users where id=current_user_id) then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_privacy_version is distinct from '0.2-beta'
     or p_terms_version is distinct from '0.1-beta' then
    raise exception 'policy_version_changed';
  end if;

  -- Serialize consent updates on all devices for this user.
  perform 1 from public.profiles where id=current_user_id for update;
  select * into previous
  from public.user_consents
  where user_id=current_user_id
  order by event_id desc
  limit 1;

  needs_terms := previous.terms_version is distinct from p_terms_version
    or previous.terms_accepted_at is null;
  needs_adult := previous.adult_confirmed_at is null;

  if needs_terms and coalesce(p_accept_terms,false) is not true then
    raise exception 'terms_acceptance_required' using errcode='42501';
  end if;
  if needs_adult and coalesce(p_confirm_adult,false) is not true then
    raise exception 'adult_confirmation_required' using errcode='42501';
  end if;

  -- No optional provider exists. Future activation requires a new
  -- notice/version/migration.
  if coalesce(p_ads_consent,false)
     or coalesce(p_personalized_ads_consent,false) then
    raise exception 'optional_technologies_not_enabled';
  end if;

  insert into public.user_consents(
    user_id, privacy_version, terms_version, terms_accepted_at,
    adult_confirmed_at, analytics_consent, ads_consent,
    personalized_ads_consent
  ) values (
    current_user_id,
    p_privacy_version,
    case when needs_terms then p_terms_version else previous.terms_version end,
    case when needs_terms then now() else previous.terms_accepted_at end,
    case when needs_adult then now() else previous.adult_confirmed_at end,
    coalesce(p_analytics_consent,false),
    false,
    false
  ) returning * into result;
  return result;
end
$function$


;
