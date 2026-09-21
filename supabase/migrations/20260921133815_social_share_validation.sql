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
