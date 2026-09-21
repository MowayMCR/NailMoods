alter table public.inspiration_shares add column client_id uuid;
create unique index inspiration_shares_retry_key on public.inspiration_shares(sender_id,client_id) where client_id is not null;
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
 select w.owner_user_id into recipient from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join public.profiles p on p.id=w.owner_user_id where w.id=p_recipient_workspace_id and pp.is_public and private.effective_tier(p.id)='pro';
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

