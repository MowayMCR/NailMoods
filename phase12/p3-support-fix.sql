create or replace function private.nm_support(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); rid uuid; existing uuid; v_attachment text:=nullif(p_data->>'attachment',''); result jsonb; off int:=greatest(coalesce((p_data->>'offset')::int,0),0); entry jsonb;
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
 if v_attachment is not null and (split_part(v_attachment,'/',1)<>me::text or split_part(v_attachment,'/',3)<>'support' or split_part(v_attachment,'/',4) !~ ('^'||rid::text||'\.(png|jpeg|webp)$') or not exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=v_attachment and (metadata->>'size')::bigint between 1 and 2097152 and metadata->>'mimetype' in ('image/png','image/jpeg','image/webp'))) then raise exception 'invalid_attachment' using errcode='42501';end if;
 insert into private.support_tickets(id,author,category,description,screen,environment,app_version,platform,diagnostics,attachment)
 values(rid,me,p_data->>'category',trim(p_data->>'description'),p_data->>'screen',p_data->>'environment',p_data->>'app_version',p_data->>'platform',coalesce(p_data->'diagnostics','[]'),v_attachment);
 return jsonb_build_object('id',rid);
end $$;
