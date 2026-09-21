CREATE OR REPLACE FUNCTION private.discovery_visible(p_owner uuid, p_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.discovery_allowed() and exists(select 1 from public.profiles p where p.id=p_owner and private.effective_tier(p.id) in ('plus','pro') and (
 (p.username is not null and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and private.tier_allows(true))))
 or (private.effective_tier(p.id)='pro' and exists(select 1 from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id where w.id=p_workspace and w.owner_user_id=p.id and pp.is_public and w.public_handle is not null))));
$function$

;
