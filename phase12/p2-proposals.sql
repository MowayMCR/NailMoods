CREATE OR REPLACE FUNCTION private.send_nailmoods_proposal(p_recipient_user_id uuid, p_source_local_id text, p_snapshot jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare recipient uuid; recipient_space uuid; sid uuid; cid uuid; payload jsonb; token uuid:=(p_snapshot->>'client_id')::uuid;
begin
 perform private.require_feature('social');
 if (select count(*) from public.inspiration_shares where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'SHARE_RATE_LIMIT';end if;
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 perform private.require_feature('pro');
 recipient:=p_recipient_user_id;
 select id into recipient_space from public.workspaces where owner_user_id=recipient and kind='personal' order by created_at limit 1;
 if recipient_space is null then raise exception 'RECIPIENT_UNAVAILABLE' using errcode='42501';end if;
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
 'proposal',true,'can_save',p_snapshot->'can_save'='true'::jsonb,
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

 insert into public.inspiration_shares(sender_id,recipient_id,recipient_workspace_id,source_local_id,snapshot,client_id) values(auth.uid(),recipient,recipient_space,left(p_source_local_id,120),payload,token) returning id into sid;
 insert into public.messages(conversation_id,sender_id,share_id) values(cid,auth.uid(),sid);
 insert into public.user_notifications(user_id,kind,actor_id) values(recipient,'inspiration',auth.uid());
 return sid;
end $function$
;


create function public.send_nailmoods_proposal(p_recipient_user_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language sql set search_path='' as $$select private.send_nailmoods_proposal(p_recipient_user_id,p_source_local_id,p_snapshot)$$;
revoke all on function private.send_nailmoods_proposal(uuid,text,jsonb),public.send_nailmoods_proposal(uuid,text,jsonb) from public,anon;
grant execute on function private.send_nailmoods_proposal(uuid,text,jsonb),public.send_nailmoods_proposal(uuid,text,jsonb) to authenticated;
create function private.nm_share_peer(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare peer uuid;
begin
 perform private.nm_share_detail(p_id);
 select case when sender_id=auth.uid() then recipient_id else sender_id end into peer from public.inspiration_shares where id=p_id;
 return (select jsonb_build_object('user_id',id,'handle',username,'display_name',display_name) from public.profiles where id=peer);
end $$;
create function public.nm_share_peer(p_id uuid) returns jsonb language sql set search_path='' as $$select private.nm_share_peer(p_id)$$;
revoke all on function private.nm_share_peer(uuid),public.nm_share_peer(uuid) from public,anon;
grant execute on function private.nm_share_peer(uuid),public.nm_share_peer(uuid) to authenticated;

