-- Real recette identities and installed functions, authenticated SQL role.
-- No password/JWT login is asserted by this test. All fixture changes roll back.
begin;
select set_config('request.jwt.claim.sub','42623ae8-1f1b-475f-bf0f-0e08114a4462',true);
set local role authenticated;
do $$declare s jsonb;r jsonb;id uuid;begin
 s:=public.nm_po_loop('state','c0bbac6a-affe-4ac4-b3ef-a77277b3205d','{}');
 if s->>'canAdapt'<>'true' then raise exception 'PO_CANNOT_ADAPT';end if;
 r:=public.nm_po_loop('reply','c0bbac6a-affe-4ac4-b3ef-a77277b3205d',jsonb_build_object('title','Test transactionnel boucle PO','client_id',gen_random_uuid(),'can_save',true,'preview',jsonb_build_object('shape','Ovale','length','Moyenne','nails',(select jsonb_agg(jsonb_build_object('color','#773b59')) from generate_series(1,5))),'colors',jsonb_build_array('#773b59')));
 perform set_config('test.po_reply',r->>'id',true);
 begin perform public.nm_catalog_manage('queue','{}');raise exception 'NON_STAFF_ALLOWED';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
set local role authenticated;
do $$declare r jsonb;begin
 r:=public.nm_po_loop('like',current_setting('test.po_reply')::uuid,'{"liked":true}');
 if r->>'liked'<>'true' then raise exception 'LIKE_FAILED';end if;
 r:=public.nm_proposal_for_save(current_setting('test.po_reply')::uuid);
 if r ? 'notes' or r ? 'images' then raise exception 'PRIVATE_FIELDS_IN_SAVE';end if;
 begin perform public.nm_po_loop('reply','c0bbac6a-affe-4ac4-b3ef-a77277b3205d','{}');raise exception 'CLIENT_REPLY_ALLOWED';exception when insufficient_privilege then null;end;
 begin perform 1 from private.catalog_products;raise exception 'DIRECT_CATALOG_ALLOWED';exception when insufficient_privilege then null;end;
end$$;
reset role;
insert into private.support_staff(user_id) values('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1') on conflict do nothing;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
set local role authenticated;
do $$declare b jsonb;begin
 b:=public.nm_catalog_manage('import_preview','{"name":"Test transactionnel","rows":[{"catalogId":"TRANSACTION-TEST-CATALOGUE","name":"Cassis test","brand":"NailMoods Test"}]}');
 perform public.nm_catalog_manage('import_apply',jsonb_build_object('id',b->>'id'));
 perform public.nm_catalog_manage('import_rollback',jsonb_build_object('id',b->>'id'));
 if not exists(select 1 from jsonb_array_elements(public.nm_catalog_read('TRANSACTION-TEST',250)) p where p->>'catalogId'='TRANSACTION-TEST-CATALOGUE' and p->>'archived'='true') then raise exception 'IMPORT_ROLLBACK_FAILED';end if;
end$$;
reset role;
select jsonb_build_object('passed',true,'checks',jsonb_build_array('PO recipient and accepted connection','Linked proposal and private save projection','Customer like','Non-staff catalogue refused','Direct table denied','Import preview/apply/rollback')) as result;
rollback;
