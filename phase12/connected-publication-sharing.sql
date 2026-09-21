-- Social sharing stores a revocable reference, never a copy of the public photo or private original.
create or replace function private.send_nailmoods_publication(p_recipient_user_id uuid,p_kind text,p_id uuid,p_client_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; sid uuid;
begin
 perform private.require_feature('social');
 if p_kind not in ('journal','inspiration') or p_client_id is null then raise exception 'INVALID_PUBLICATION';end if;
 perform private.nm_discover('detail',jsonb_build_object('kind',p_kind,'id',p_id));
 cid:=(private.nm_social('open',jsonb_build_object('user_id',p_recipient_user_id))->>'conversation_id')::uuid;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client_id::text,0));
 select id into sid from public.inspiration_shares where sender_id=auth.uid() and client_id=p_client_id;
 if sid is not null then return sid;end if;
 if (select count(*) from public.inspiration_shares where sender_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'SHARE_RATE_LIMIT';end if;
 insert into public.inspiration_shares(sender_id,recipient_id,client_id,snapshot)
 values(auth.uid(),p_recipient_user_id,p_client_id,jsonb_build_object('title','Publication NailMoods','public_reference',jsonb_build_object('kind',p_kind,'id',p_id))) returning id into sid;
 insert into public.messages(conversation_id,sender_id,share_id) values(cid,auth.uid(),sid);
 insert into public.user_notifications(user_id,kind,actor_id) values(p_recipient_user_id,'inspiration',auth.uid());
 return sid;
end $$;
revoke all on function private.send_nailmoods_publication(uuid,text,uuid,uuid) from public,anon;
grant execute on function private.send_nailmoods_publication(uuid,text,uuid,uuid) to authenticated;
create or replace function public.send_nailmoods_publication(p_recipient_user_id uuid,p_kind text,p_id uuid,p_client_id uuid)
returns uuid language sql security invoker set search_path='' as $$select private.send_nailmoods_publication(p_recipient_user_id,p_kind,p_id,p_client_id)$$;
revoke all on function public.send_nailmoods_publication(uuid,text,uuid,uuid) from public,anon;
grant execute on function public.send_nailmoods_publication(uuid,text,uuid,uuid) to authenticated;
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
 if s.id is null or private.effective_tier(s.sender_id) not in ('plus','pro') or private.effective_tier(s.recipient_id) not in ('plus','pro') or not exists(select 1 from private.social_connections c where c.status='accepted' and least(c.requester,c.recipient)=least(s.sender_id,s.recipient_id) and greatest(c.requester,c.recipient)=greatest(s.sender_id,s.recipient_id)) then raise exception 'SHARE_UNAVAILABLE' using errcode='42501';end if;
 if s.snapshot ? 'public_reference' then
 return s.snapshot || jsonb_build_object('publication',private.nm_discover('detail',s.snapshot->'public_reference'));
 end if;
 return s.snapshot;
end $function$
;
