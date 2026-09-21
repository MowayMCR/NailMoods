-- Real RLS/RPC checks using existing isolated fixture identities. No retained changes.
begin;
update public.profiles set account_tier=case when id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1' then 'plus' else 'pro' end,discovery_visibility='everyone' where id in ('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','42623ae8-1f1b-475f-bf0f-0e08114a4462');
update public.pro_profiles set is_public=true where workspace_id='50d68b83-bfad-4849-a373-33f595e93dc0';
delete from private.social_connections where requester in ('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','42623ae8-1f1b-475f-bf0f-0e08114a4462') and recipient in ('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','42623ae8-1f1b-475f-bf0f-0e08114a4462');
insert into private.social_connections(requester,recipient,status) values('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','42623ae8-1f1b-475f-bf0f-0e08114a4462','accepted');
-- Expiring entitlement overrides a still-Plus profile.
update private.account_entitlements set expires_at=now()-interval '1 second' where user_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1';
set local role authenticated;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $$begin
 if public.nm_capabilities()->>'tier'<>'free' then raise exception 'STALE_TIER_TRUSTED';end if;
 insert into public.user_products(workspace_id,created_by,shade_name,hex) values('472859d9-0c09-4dbf-a307-d6ff7289b537',auth.uid(),'P2 ROLLBACK','#AABBCC');
 insert into public.journal_entries(workspace_id,created_by,performed_on,visibility,snapshot) values('472859d9-0c09-4dbf-a307-d6ff7289b537',auth.uid(),current_date,'private','{"title":"P2 private"}');
 begin perform public.nm_social('list');raise exception 'FREE_SOCIAL_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform public.nm_discover('discover');raise exception 'FREE_DISCOVERY_ALLOWED';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.search_nailmoods('social.fixture')) then raise exception 'FREE_SEARCH_ALLOWED';end if;
 begin insert into public.inspirations(workspace_id,created_by,title,snapshot) values('472859d9-0c09-4dbf-a307-d6ff7289b537',auth.uid(),'Forbidden','{"intent":"photos","photoSources":[]}');raise exception 'FREE_PHOTOS_ALLOWED';exception when insufficient_privilege then null;end;
 if (public.nm_quota_state()->>'enabled')::boolean then raise exception 'REALISTIC_ACTIVATED';end if;
end $$;
reset role;
update private.account_entitlements set expires_at=null where user_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1';
set local role authenticated;
do $$declare sid uuid;s jsonb;begin
 sid:=public.send_nailmoods_share_to_po('50d68b83-bfad-4849-a373-33f595e93dc0','p2-rollback','{"title":"P2 fiche","colors":["#AABBCC"],"techniques":[],"requirements":[],"notes":"PRIVATE NOTE","include_notes":false,"include_images":false,"images":[{"src":"FORBIDDEN"}],"products":[{"name":"Rose","reference":"123","private_note":"SECRET"}]}'::jsonb);
 s:=public.nm_share_detail(sid);
 if s::text like '%PRIVATE NOTE%' or s::text like '%SECRET%' or jsonb_array_length(s->'images')<>0 then raise exception 'OPT_IN_LEAK';end if;
 perform set_config('test.share',sid::text,true);
 sid:=public.send_nailmoods_share_to_po('50d68b83-bfad-4849-a373-33f595e93dc0','p2-note','{"title":"P2 notes consenties","colors":[],"techniques":[],"requirements":[],"include_notes":true,"notes":"NOTE AUTORISÉE"}'::jsonb);
 if public.nm_share_detail(sid)->>'notes'<>'NOTE AUTORISÉE' then raise exception 'EXPLICIT_NOTES_LOST';end if;
 begin perform public.send_nailmoods_share_to_po('50d68b83-bfad-4849-a373-33f595e93dc0','p2-forged','{"title":"Forgery","colors":[],"techniques":[],"requirements":[],"include_images":true,"images":[{"src":"42623ae8-1f1b-475f-bf0f-0e08114a4462/other/private.jpg"}]}');raise exception 'FOREIGN_IMAGE_ALLOWED';exception when insufficient_privilege then null;end;
 insert into public.inspirations(id,workspace_id,created_by,title,snapshot) values('db6d16d6-092d-481c-ae2e-b58cb8a993af','472859d9-0c09-4dbf-a307-d6ff7289b537',auth.uid(),'P2 retained project','{"key":"p2-retained","intent":"photos","photoSources":[],"isProject":true}');
end $$;
select set_config('request.jwt.claim.sub','42623ae8-1f1b-475f-bf0f-0e08114a4462',true);
do $$begin
 if public.nm_share_detail(current_setting('test.share')::uuid)->>'title'<>'P2 fiche' then raise exception 'RECIPIENT_DETAIL';end if;
 if not exists(select 1 from public.received_nailmoods_po_shares() where id=current_setting('test.share')::uuid) then raise exception 'INBOX_MISSING';end if;
end $$;
reset role;
update private.account_entitlements set tier='free' where user_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1';
set local role authenticated;
do $$begin
 begin perform public.nm_share_detail(current_setting('test.share')::uuid);raise exception 'DOWNGRADE_SHARE_ALLOWED';exception when insufficient_privilege then null;end;
end $$;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
do $$begin
 if not exists(select 1 from public.inspirations where id='db6d16d6-092d-481c-ae2e-b58cb8a993af') then raise exception 'DOWNGRADE_DELETED_PROJECT';end if;
 begin update public.inspirations set snapshot=snapshot||'{"notes":"advanced edit"}' where id='db6d16d6-092d-481c-ae2e-b58cb8a993af';raise exception 'DOWNGRADE_PHOTO_EDIT_ALLOWED';exception when insufficient_privilege then null;end;
end $$;
reset role;
update private.account_entitlements set tier='plus' where user_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1';
set local role authenticated;
select set_config('request.jwt.claim.sub','42623ae8-1f1b-475f-bf0f-0e08114a4462',true);
do $$declare sid uuid; again uuid; token uuid:=gen_random_uuid();payload jsonb;begin
 payload:=jsonb_build_object('title','P2 proposition privée','colors','[]'::jsonb,'techniques','[]'::jsonb,'requirements','[]'::jsonb,'can_save',false,'client_id',token);
 sid:=public.send_nailmoods_proposal('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','p2-proposal',payload);
 again:=public.send_nailmoods_proposal('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','p2-proposal',payload);
 if sid<>again then raise exception 'DUPLICATE_PROPOSAL';end if;
 perform set_config('test.proposal',sid::text,true);
 sid:=public.send_nailmoods_proposal('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','p2-shareable',payload||jsonb_build_object('can_save',true,'client_id',gen_random_uuid()));
 perform set_config('test.shareable',sid::text,true);
end $$;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
do $$begin
 begin perform public.nm_proposal_for_save(current_setting('test.proposal')::uuid);raise exception 'UNAUTHORIZED_PROPOSAL_SAVE';exception when insufficient_privilege then null;end;
 if public.nm_proposal_for_save(current_setting('test.shareable')::uuid)->>'title'<>'P2 proposition privée' then raise exception 'SHAREABLE_PROPOSAL_LOST';end if;
 begin perform public.send_nailmoods_proposal('42623ae8-1f1b-475f-bf0f-0e08114a4462','not-pro','{}');raise exception 'PLUS_PROPOSED_AS_PRO';exception when insufficient_privilege then null;end;
end $$;
select public.record_privacy_choices(p_privacy_version=>'0.2-beta',p_terms_version=>'0.1-beta',p_accept_terms=>false,p_confirm_adult=>false,p_analytics_consent=>false,p_ads_consent=>false,p_personalized_ads_consent=>false);
do $$declare batch jsonb;begin
 batch:=jsonb_build_array(jsonb_build_object('event_name','message_sent','session_id',gen_random_uuid(),'metadata',jsonb_build_object('notes','SECRET','photo','SECRET','body','SECRET')));
 if public.record_analytics_events(batch)<>0 then raise exception 'ANALYTICS_WITHOUT_CONSENT';end if;
 perform public.record_privacy_choices(p_privacy_version=>'0.2-beta',p_terms_version=>'0.1-beta',p_accept_terms=>false,p_confirm_adult=>false,p_analytics_consent=>true,p_ads_consent=>false,p_personalized_ads_consent=>false);
 if public.record_analytics_events(batch)<>1 then raise exception 'CONSENTED_ANALYTICS_MISSING';end if;
 perform public.record_privacy_choices(p_privacy_version=>'0.2-beta',p_terms_version=>'0.1-beta',p_accept_terms=>false,p_confirm_adult=>false,p_analytics_consent=>false,p_ads_consent=>false,p_personalized_ads_consent=>false);
 if public.record_analytics_events(batch)<>0 then raise exception 'ANALYTICS_AFTER_REVOKE';end if;
end $$;
reset role;
do $$begin
 if exists(select 1 from private.analytics_events e join private.analytics_identities i using(analytics_user_id) where i.user_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1' and e.ingested_at>=now() and e.metadata::text like '%SECRET%') then raise exception 'ANALYTICS_PRIVATE_DATA';end if;
end $$;
select 'PASS entitlement expiry, personal Free writes, social/search/discovery/photo denial, explicit notes, forged image denial, PO inbox, downgrade retention and locking; proposals, copy permissions, retry deduplication; analytics opt-in/revocation and metadata privacy' result;
rollback;
