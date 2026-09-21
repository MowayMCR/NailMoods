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
