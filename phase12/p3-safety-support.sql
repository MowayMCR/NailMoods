-- Recette: closed tables, invoker public entrypoints and explicit authorization.
create table private.social_blocks (
 blocker uuid not null references auth.users on delete cascade,
 blocked uuid not null references auth.users on delete cascade,
 created_at timestamptz not null default now(), primary key(blocker,blocked), check(blocker<>blocked)
);
create index social_blocks_target_idx on private.social_blocks(blocked,blocker);
create table private.support_staff(user_id uuid primary key references auth.users on delete cascade);
create table private.support_tickets (
 id uuid primary key, author uuid not null references auth.users on delete cascade,
 category text not null, description text not null, screen text not null,
 environment text not null, app_version text not null, platform text not null,
 diagnostics jsonb not null default '[]', attachment text,
 status text not null default 'new' check(status in ('new','under_review','resolved','dismissed')),
 reply text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index support_tickets_author_idx on private.support_tickets(author,created_at desc,id);
create index support_tickets_queue_idx on private.support_tickets(status,created_at,id);
create table private.safety_reports (
 id uuid primary key, author uuid not null references auth.users on delete cascade,
 target_user uuid references auth.users on delete set null, target_kind text not null,
 target_id uuid, category text not null, description text not null,
 status text not null default 'new' check(status in ('new','under_review','resolved','dismissed')),
 reply text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index safety_reports_author_idx on private.safety_reports(author,created_at desc,id);
create index safety_reports_target_idx on private.safety_reports(target_user);
create index safety_reports_queue_idx on private.safety_reports(status,created_at,id);
alter table private.social_blocks enable row level security;
alter table private.support_staff enable row level security;
alter table private.support_tickets enable row level security;
alter table private.safety_reports enable row level security;
revoke all on private.social_blocks,private.support_staff,private.support_tickets,private.safety_reports from public,anon,authenticated;

create function private.nm_blocked(peer uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.social_blocks where (blocker=auth.uid() and blocked=peer) or (blocked=auth.uid() and blocker=peer))
$$;
revoke all on function private.nm_blocked(uuid) from public,anon;
grant execute on function private.nm_blocked(uuid) to authenticated;
create function private.nm_support_staff() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.support_staff where user_id=auth.uid())
$$;
revoke all on function private.nm_support_staff() from public,anon;
grant execute on function private.nm_support_staff() to authenticated;

-- Only an authorized report/support operator may see an explicitly attached screenshot.
create function private.nm_support_attachment(path text) returns boolean language sql stable security definer set search_path='' as $$
 select private.nm_support_staff() and exists(select 1 from private.support_tickets where attachment=path)
$$;
revoke all on function private.nm_support_attachment(text) from public,anon;
grant execute on function private.nm_support_attachment(text) to authenticated;
create policy support_staff_attached_screenshot on storage.objects for select to authenticated
using(bucket_id='nailmoods-private' and private.nm_support_attachment(name));

create function private.nm_safety(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); peer uuid; cid uuid; rid uuid; result jsonb; visible jsonb; target text:=p_data->>'kind'; h text:=lower(trim(leading '@' from trim(p_data->>'handle')));
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>12000 then raise exception 'invalid_request';end if;
 if p_action='blocked' then
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',b.blocked,'handle',p.username,'display_name',p.display_name) order by b.created_at desc) from private.social_blocks b join public.profiles p on p.id=b.blocked where b.blocker=me),'[]');
 elsif p_action='unblock' then
 peer:=(p_data->>'user_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(least(me,peer)::text||':'||greatest(me,peer)::text,0));
 delete from private.social_blocks where blocker=me and blocked=peer;
 return '{"ok":true}'; -- Never restore the old connection.
 end if;
 perform private.require_feature('social');
 if p_action not in ('block','report') then raise exception 'unknown_action';end if;
 if p_action='report' then
 rid:=(p_data->>'client_id')::uuid;
 if rid is null then raise exception 'client_id_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('report:'||me::text,0));
 select id into cid from private.safety_reports where id=rid and author=me;
 if cid is not null then return jsonb_build_object('id',cid);end if;
 if (select count(*) from private.safety_reports where author=me and created_at>now()-interval '1 hour')>=10 then raise exception 'report_rate_limit';end if;
 if coalesce(p_data->>'category','') not in ('harassment','spam','inappropriate','rights','other') or length(coalesce(p_data->>'description',''))>2000 then raise exception 'invalid_report';end if;
 end if;
 if target='message' and p_action='report' then
 select m.sender_id,m.id into peer,cid from public.messages m where m.id=(p_data->>'id')::uuid and exists(select 1 from public.conversation_members cm where cm.conversation_id=m.conversation_id and cm.user_id=me);
 elsif target in ('journal','inspiration') and p_action='report' then
 visible:=private.nm_discover('detail',jsonb_build_object('kind',target,'id',p_data->>'id'));
 cid:=(visible->>'id')::uuid;
 if target='journal' then select created_by into peer from public.journal_entries where id=cid;
 else select created_by into peer from public.inspirations where id=cid;end if;
 elsif target='profile' then
 if p_data->>'user_id' is not null then
 select p.id into peer from public.profiles p where p.id=(p_data->>'user_id')::uuid and exists(select 1 from private.social_connections c where me in(c.requester,c.recipient) and p.id in(c.requester,c.recipient));
 else
 visible:=private.get_public_profile(h);
 if visible is not null then
 select p.id into peer from public.profiles p where p.username=h;
 if peer is null then select owner_user_id into peer from public.workspaces where public_handle=h;end if;
 end if;
 end if;
 cid:=peer;
 else raise exception 'invalid_target';end if;
 if peer is null or peer=me then raise exception 'target_unavailable' using errcode='42501';end if;
 if p_action='block' then
 perform pg_advisory_xact_lock(hashtextextended(least(me,peer)::text||':'||greatest(me,peer)::text,0));
 insert into private.social_blocks(blocker,blocked) values(me,peer) on conflict do nothing;
 delete from private.social_connections where least(requester,recipient)=least(me,peer) and greatest(requester,recipient)=greatest(me,peer);
 return '{"ok":true}';
 end if;
 insert into private.safety_reports(id,author,target_user,target_kind,target_id,category,description)
 values(rid,me,peer,target,cid,p_data->>'category',coalesce(p_data->>'description',''));
 return jsonb_build_object('id',rid);
end $$;
revoke all on function private.nm_safety(text,jsonb) from public,anon;
grant execute on function private.nm_safety(text,jsonb) to authenticated;
create function public.nm_safety(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.nm_safety(p_action,p_data)$$;
revoke all on function public.nm_safety(text,jsonb) from public,anon;
grant execute on function public.nm_safety(text,jsonb) to authenticated;

create function private.nm_support(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); rid uuid; existing uuid; attachment text:=nullif(p_data->>'attachment',''); result jsonb; off int:=greatest(coalesce((p_data->>'offset')::int,0),0); entry jsonb;
begin
 if me is null or not exists(select 1 from auth.users where id=me and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501';end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>24000 then raise exception 'invalid_request';end if;
 if p_action='status' then return jsonb_build_object('staff',private.nm_support_staff());end if;
 if p_action='list' or p_action='export' then
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id),'[]') into result from (
 select id,'support' kind,category,description,status,reply,created_at,screen,environment,app_version,platform,diagnostics,attachment from private.support_tickets where author=me
 union all select id,'report',category,description,status,reply,created_at,target_kind,'','','','[]'::jsonb,null from private.safety_reports where author=me
 order by created_at desc,id limit 21 offset off) t;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(v order by ord),'[]') from jsonb_array_elements(result) with ordinality e(v,ord) where ord<=20),'hasMore',jsonb_array_length(result)>20);
 elsif p_action in ('queue','review') then
 if not private.nm_support_staff() then raise exception 'staff_required' using errcode='42501';end if;
 if p_action='review' then
 if coalesce(p_data->>'status','') not in ('under_review','resolved','dismissed') or length(coalesce(p_data->>'reply',''))>2000 then raise exception 'invalid_review';end if;
 if p_data->>'kind'='support' then update private.support_tickets set status=p_data->>'status',reply=coalesce(p_data->>'reply',''),updated_at=now() where id=(p_data->>'id')::uuid returning id into rid;
 elsif p_data->>'kind'='report' then update private.safety_reports set status=p_data->>'status',reply=coalesce(p_data->>'reply',''),updated_at=now() where id=(p_data->>'id')::uuid returning id into rid;end if;
 if rid is null then raise exception 'ticket_unavailable';end if;return jsonb_build_object('id',rid);
 end if;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.created_at desc,t.id),'[]') into result from (
 select id,'support' kind,category,description,status,reply,created_at,screen,diagnostics,attachment,null::text evidence from private.support_tickets
 union all select r.id,'report',r.category,r.description,r.status,r.reply,r.created_at,r.target_kind,'[]'::jsonb,null,
 case when r.target_kind='message' then (select left(body,2000) from public.messages where id=r.target_id) else r.target_id::text end
 from private.safety_reports r order by created_at desc,id limit 21 offset off)t;
 return jsonb_build_object('items',(select coalesce(jsonb_agg(v order by ord),'[]') from jsonb_array_elements(result) with ordinality e(v,ord) where ord<=20),'hasMore',jsonb_array_length(result)>20);
 elsif p_action<>'submit' then raise exception 'unknown_action';end if;
 rid:=(p_data->>'client_id')::uuid;if rid is null then raise exception 'client_id_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('support:'||me::text,0));
 select id into existing from private.support_tickets where id=rid and author=me;
 if existing is not null then return jsonb_build_object('id',existing);end if;
 if (select count(*) from private.support_tickets where author=me and created_at>now()-interval '1 hour')>=5 then raise exception 'support_rate_limit';end if;
 if coalesce(p_data->>'category','') not in ('bug','product','color','idea','suggestion','interface','account','other') or length(trim(coalesce(p_data->>'description',''))) not between 5 and 4000 then raise exception 'invalid_ticket';end if;
 if coalesce(p_data->>'environment','') not in ('recette','production') or coalesce(p_data->>'platform','') not in ('Android','iOS','Desktop','Other') or coalesce(p_data->>'screen','') not in ('home','create','collection','journal','profile','help','other') or coalesce(p_data->>'app_version','') !~ '^[a-zA-Z0-9._-]{1,50}$' then raise exception 'invalid_context';end if;
 if jsonb_typeof(coalesce(p_data->'diagnostics','[]'))<>'array' or jsonb_array_length(coalesce(p_data->'diagnostics','[]'))>30 then raise exception 'invalid_diagnostics';end if;
 for entry in select value from jsonb_array_elements(coalesce(p_data->'diagnostics','[]')) loop
 if jsonb_typeof(entry)<>'object' or coalesce(entry->>'category','') not in ('auth','network','supabase','storage','generation','import','social','ui') or coalesce(entry->>'code','') not in ('operation_ok','operation_failed','offline','unhandled') or coalesce(entry->>'outcome','') not in ('ok','error') or (select count(*) from jsonb_object_keys(entry))<>4 or coalesce(entry->>'at','') !~ '^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$' then raise exception 'invalid_diagnostics';end if;
 end loop;
 if attachment is not null and (split_part(attachment,'/',1)<>me::text or split_part(attachment,'/',3)<>'support' or split_part(attachment,'/',4) !~ ('^'||rid::text||'\.(png|jpeg|webp)$') or not exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=attachment and (metadata->>'size')::bigint between 1 and 2097152 and metadata->>'mimetype' in ('image/png','image/jpeg','image/webp'))) then raise exception 'invalid_attachment' using errcode='42501';end if;
 insert into private.support_tickets(id,author,category,description,screen,environment,app_version,platform,diagnostics,attachment)
 values(rid,me,p_data->>'category',trim(p_data->>'description'),p_data->>'screen',p_data->>'environment',p_data->>'app_version',p_data->>'platform',coalesce(p_data->'diagnostics','[]'),attachment);
 return jsonb_build_object('id',rid);
end $$;
revoke all on function private.nm_support(text,jsonb) from public,anon;
grant execute on function private.nm_support(text,jsonb) to authenticated;
create function public.nm_support(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.nm_support(p_action,p_data)$$;
revoke all on function public.nm_support(text,jsonb) from public,anon;
grant execute on function public.nm_support(text,jsonb) to authenticated;

-- Extra restrictive guard: future permissive policies cannot make a blocked pair readable.
create policy blocked_notification_guard on public.user_notifications as restrictive for select to authenticated using(actor_id is null or not private.nm_blocked(actor_id));
create policy blocked_share_guard on public.inspiration_shares as restrictive for select to authenticated using(not private.nm_blocked(case when sender_id=auth.uid() then recipient_id else sender_id end));
create policy blocked_journal_guard on public.journal_entries as restrictive for select to authenticated using(created_by=auth.uid() or not private.nm_blocked(created_by));
create policy blocked_inspiration_guard on public.inspirations as restrictive for select to authenticated using(created_by=auth.uid() or not private.nm_blocked(created_by));
