create function private.nm_proposal_for_save(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s jsonb;
begin
 s:=private.nm_share_detail(p_id);
 if s->'proposal' is distinct from 'true'::jsonb or s->'can_save' is distinct from 'true'::jsonb or not exists(select 1 from public.inspiration_shares where id=p_id and recipient_id=auth.uid()) then raise exception 'PROPOSAL_NOT_SHAREABLE' using errcode='42501';end if;
 return s-'images'-'notes';
end $$;
create function public.nm_proposal_for_save(p_id uuid) returns jsonb language sql set search_path='' as $$select private.nm_proposal_for_save(p_id)$$;
revoke all on function private.nm_proposal_for_save(uuid),public.nm_proposal_for_save(uuid) from public,anon;
grant execute on function private.nm_proposal_for_save(uuid),public.nm_proposal_for_save(uuid) to authenticated;

