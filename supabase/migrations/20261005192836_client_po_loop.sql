begin;
-- Replies stay in inspiration_shares/messages; no second project or inbox model.
alter table public.inspiration_shares add column reply_to_share_id uuid references public.inspiration_shares(id) on delete cascade;
alter table public.inspiration_shares add column liked_at timestamptz;
create index inspiration_shares_reply_idx on public.inspiration_shares(reply_to_share_id) where reply_to_share_id is not null;
-- Column ACLs are not used for business changes: existing table access must not
-- allow a client to attach an arbitrary share to someone else's private brief.
create function private.po_reply_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user in ('authenticated','anon') and (tg_op='INSERT' and (new.reply_to_share_id is not null or new.liked_at is not null) or tg_op='UPDATE' and (new.reply_to_share_id is distinct from old.reply_to_share_id or new.liked_at is distinct from old.liked_at)) then raise exception 'use_po_loop' using errcode='42501';end if;
 return new;
end $$;
create trigger po_reply_guard before insert or update on public.inspiration_shares for each row execute function private.po_reply_guard();
-- Small allowlist for Atelier strokes. No arbitrary metadata/URL survives.
create function private.po_preview(input jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare output jsonb:=private.discovery_preview(input);n jsonb;s jsonb;p jsonb;strokes jsonb;points jsonb;nails jsonb:='[]';idx integer:=0;
begin
 if output is null or jsonb_array_length(output->'nails')<>5 then raise exception 'composition_required';end if;
 for n in select * from jsonb_array_elements(input->'nails') loop
  if idx>=5 then exit;end if;strokes:='[]';
  if n->'proDesign' is not null and n->'proDesign'<>'null'::jsonb then
   if jsonb_typeof(n->'proDesign'->'strokes') is distinct from 'array' or jsonb_array_length(n->'proDesign'->'strokes')>80 then raise exception 'invalid_drawing';end if;
   for s in select * from jsonb_array_elements(n->'proDesign'->'strokes') loop
    if jsonb_typeof(s->'points') is distinct from 'array' or jsonb_array_length(s->'points') not between 1 and 240 or coalesce(s->>'color','') !~* '^#[0-9a-f]{6}$' or jsonb_typeof(s->'size') is distinct from 'number' or (s->>'size')::numeric not between 1 and 14 or s->>'mode' not in ('draw','erase') then raise exception 'invalid_drawing';end if;
    points:='[]';for p in select * from jsonb_array_elements(s->'points') loop
     if jsonb_typeof(p->'x') is distinct from 'number' or jsonb_typeof(p->'y') is distinct from 'number' or (p->>'x')::numeric not between 0 and 100 or (p->>'y')::numeric not between 0 and 160 then raise exception 'invalid_drawing_point';end if;
     points:=points||jsonb_build_array(jsonb_build_object('x',p->'x','y',p->'y'));
    end loop;
    strokes:=strokes||jsonb_build_array(jsonb_build_object('color',s->'color','size',s->'size','mode',s->'mode','points',points));
   end loop;
   nails:=nails||jsonb_build_array((output->'nails'->idx)||jsonb_build_object('proDesign',jsonb_build_object('base',output->'nails'->idx->'color','strokes',strokes)));
  else nails:=nails||jsonb_build_array(output->'nails'->idx);end if;idx:=idx+1;
 end loop;
 return jsonb_set(output,'{nails}',nails);
end $$;
create function private.po_loop(p_action text,p_id uuid,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();s public.inspiration_shares;reply public.inspiration_shares;root public.inspiration_shares;payload jsonb;rid uuid;token uuid;preview jsonb;
begin
 perform private.require_feature('social');
 payload:=private.nm_share_detail(p_id);
 select * into s from public.inspiration_shares where id=p_id;
 if s.id is null or private.nm_account_suspended(s.sender_id) or private.nm_account_suspended(s.recipient_id) then raise exception 'SHARE_UNAVAILABLE' using errcode='42501';end if;
 if s.reply_to_share_id is not null then perform private.nm_share_detail(s.reply_to_share_id);end if;
 if p_action='state' then
  select * into root from public.inspiration_shares where id=coalesce(s.reply_to_share_id,s.id);
  return jsonb_build_object('isRecipient',s.recipient_id=actor,'canAdapt',s.recipient_id=actor and private.effective_tier(actor)='pro' and s.reply_to_share_id is null and coalesce(s.snapshot->>'proposal','false')<>'true',
   'parentId',s.reply_to_share_id,'liked',s.liked_at is not null,
   'replies',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.snapshot->>'title','createdAt',r.created_at,'liked',r.liked_at is not null) order by r.created_at desc) from public.inspiration_shares r where r.reply_to_share_id=root.id and actor in(r.sender_id,r.recipient_id)),'[]'));
 elsif p_action='like' then
  if s.recipient_id<>actor or s.snapshot->'proposal' is distinct from 'true'::jsonb then raise exception 'recipient_required' using errcode='42501';end if;
  update public.inspiration_shares set liked_at=case when p_data->'liked'='true'::jsonb then now() else null end where id=s.id;
  return jsonb_build_object('liked',p_data->'liked'='true'::jsonb);
 elsif p_action='reply' then
  perform private.require_feature('pro');
  if s.recipient_id<>actor or s.reply_to_share_id is not null or s.snapshot->'proposal'='true'::jsonb then raise exception 'brief_recipient_required' using errcode='42501';end if;
  if length(p_data::text)>60000 then raise exception 'reply_too_large';end if;
  token:=(p_data->>'client_id')::uuid;if token is null then raise exception 'client_id_required';end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text||token::text,0));
  select * into reply from public.inspiration_shares where sender_id=actor and client_id=token;
  if reply.id is not null then
   if reply.reply_to_share_id is distinct from s.id then raise exception 'SHARE_ATTEMPT_CHANGED';end if;
   return jsonb_build_object('id',reply.id);
  end if;
  preview:=private.po_preview(p_data->'preview');
  -- Existing sender enforces accepted connection, tiers, rate limits and atomic
  -- insertion of share + message + notification. Never forward customer media.
  rid:=private.send_nailmoods_proposal(s.sender_id,s.id::text,p_data||jsonb_build_object('include_notes',false,'include_images',false,'notes','','images','[]'::jsonb));
  update public.inspiration_shares set reply_to_share_id=s.id,snapshot=jsonb_set(snapshot,'{preview}',preview) where id=rid;
  return jsonb_build_object('id',rid);
 end if;
 raise exception 'unknown_po_action';
end $$;
create function public.nm_po_loop(p_action text,p_id uuid,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.po_loop(p_action,p_id,p_data)$$;
revoke all on function private.po_reply_guard(),private.po_preview(jsonb),private.po_loop(text,uuid,jsonb),public.nm_po_loop(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function private.po_loop(text,uuid,jsonb),public.nm_po_loop(text,uuid,jsonb) to authenticated;
commit;
