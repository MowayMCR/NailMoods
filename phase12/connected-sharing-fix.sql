-- Recette only. Accepted private connections do not require a public professional directory listing.
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
 where me in(c.requester,c.recipient) and c.status='accepted' and private.effective_tier(p.id) in ('plus','pro')
 order by lower(coalesce(nullif(p.display_name,''),p.username)),p.id
 )r;return result;
 elsif p_action='list' then
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
 select m.id,m.share_id,m.body,m.sender_id=me as mine,m.created_at,s.snapshot as share from public.messages m left join public.inspiration_shares s on s.id=m.share_id and me in(s.sender_id,s.recipient_id) where m.conversation_id=cid and (p_data->>'before' is null or (m.created_at,m.id)<((p_data->>'before')::timestamptz,coalesce((p_data->>'before_id')::uuid,'00000000-0000-0000-0000-000000000000'::uuid))) order by m.created_at desc,m.id desc limit 40
 )r;
 return jsonb_build_object('conversation_id',cid,'messages',result);
 else raise exception 'unknown_action'; end if;
end $function$
;
CREATE OR REPLACE FUNCTION private.send_nailmoods_share_to_po(p_recipient_workspace_id uuid, p_source_local_id text, p_snapshot jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare recipient uuid; sid uuid; cid uuid; payload jsonb; token uuid:=(p_snapshot->>'client_id')::uuid;
begin
 perform private.require_feature('social');
 if (select count(*) from public.inspiration_shares where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'SHARE_RATE_LIMIT';end if;
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 select w.owner_user_id into recipient from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join public.profiles p on p.id=w.owner_user_id where w.id=p_recipient_workspace_id and pp.user_id=p.id and w.kind in ('pro','institute') and private.effective_tier(p.id)='pro' and exists(select 1 from auth.users u where u.id=p.id and u.email_confirmed_at is not null);
 -- The open RPC performs the definitive pair authorization and locking.
 cid:=(private.nm_social('open',jsonb_build_object('user_id',recipient))->>'conversation_id')::uuid;
 if token is not null then
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||token::text,0));
 select id into sid from public.inspiration_shares where sender_id=auth.uid() and client_id=token;
 if sid is not null then return sid;end if;
 end if;
 if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or octet_length(p_snapshot::text)>60000 then raise exception 'invalid_share';end if;
 -- Explicit allowlist; no photos, notes, prompts or arbitrary URLs.
 payload:=jsonb_build_object('title',left(p_snapshot->>'title',120),'source_type',case when p_snapshot->>'source_type'='journal' then 'journal' else 'inspiration' end,'colors',coalesce(p_snapshot->'colors','[]'),'techniques',coalesce(p_snapshot->'techniques','[]'),'requirements',coalesce(p_snapshot->'requirements','[]'),'level',left(p_snapshot->>'level',40),'mood',left(p_snapshot->>'mood',80));
 if jsonb_typeof(payload->'colors')<>'array' or jsonb_array_length(payload->'colors')>5 or exists(select 1 from jsonb_array_elements_text(payload->'colors') c where c!~*'^#[0-9a-f]{6}$') then raise exception 'invalid_palette';end if;
 if jsonb_typeof(payload->'techniques')<>'array' or jsonb_typeof(payload->'requirements')<>'array' then raise exception 'invalid_requirements';end if;
 if jsonb_array_length(payload->'techniques')>8 or jsonb_array_length(payload->'requirements')>12 or exists(select 1 from jsonb_array_elements((payload->'techniques')||(payload->'requirements')) e where jsonb_typeof(e)<>'string' or length(e#>>'{}')>120) then raise exception 'invalid_share_labels';end if;

 payload:=payload||jsonb_build_object(
 'preview',private.discovery_preview(coalesce(p_snapshot->'preview','{}')),
 'include_notes',p_snapshot->'include_notes'='true'::jsonb,
 'notes',case when p_snapshot->'include_notes'='true'::jsonb then left(p_snapshot->>'notes',2000) else '' end,
 'include_images',p_snapshot->'include_images'='true'::jsonb,
 'images',case when p_snapshot->'include_images'='true'::jsonb then coalesce(p_snapshot->'images','[]') else '[]'::jsonb end,
 'products',coalesce(p_snapshot->'products','[]'),'equipment',coalesce(p_snapshot->'equipment','[]'),'missing',coalesce(p_snapshot->'missing','[]'));
 if jsonb_typeof(payload->'images')<>'array' or jsonb_array_length(payload->'images')>4 then raise exception 'INVALID_IMAGES';end if;
 if exists(select 1 from jsonb_array_elements(payload->'images') img where jsonb_typeof(img)<>'object' or coalesce(img->>'src','')='' or split_part(img->>'src','/',1)<>auth.uid()::text or not exists(select 1 from storage.objects o where o.bucket_id='nailmoods-private' and o.name=img->>'src')) then raise exception 'IMAGE_NOT_OWNED' using errcode='42501';end if;
 if jsonb_typeof(payload->'products')<>'array' or jsonb_array_length(payload->'products')>5 or jsonb_typeof(payload->'equipment')<>'array' or jsonb_array_length(payload->'equipment')>12 or jsonb_typeof(payload->'missing')<>'array' or jsonb_array_length(payload->'missing')>12 then raise exception 'INVALID_PRODUCTS';end if;
 payload:=jsonb_set(payload,'{products}',coalesce((select jsonb_agg(private.share_product(p)) from jsonb_array_elements(payload->'products') p),'[]'));
 payload:=jsonb_set(payload,'{equipment}',coalesce((select jsonb_agg(private.share_product(p)) from jsonb_array_elements(payload->'equipment') p),'[]'));
 payload:=jsonb_set(payload,'{images}',coalesce((select jsonb_agg(jsonb_build_object('src',p->>'src')) from jsonb_array_elements(payload->'images') p),'[]'));
 payload:=jsonb_set(payload,'{missing}',coalesce((select jsonb_agg(left(p#>>'{}',120)) from jsonb_array_elements(payload->'missing') p where jsonb_typeof(p)='string'),'[]'));

 insert into public.inspiration_shares(sender_id,recipient_id,recipient_workspace_id,source_local_id,snapshot,client_id) values(auth.uid(),recipient,p_recipient_workspace_id,left(p_source_local_id,120),payload,token) returning id into sid;
 insert into public.messages(conversation_id,sender_id,share_id) values(cid,auth.uid(),sid);
 insert into public.user_notifications(user_id,kind,actor_id) values(recipient,'inspiration',auth.uid());
 return sid;
end $function$
;
