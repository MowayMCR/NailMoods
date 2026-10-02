-- Review uploaded publication images before exposing them in Discover.
-- Does not copy private Journal notes or messages into the staff queue.
begin;
create table private.publication_reviews(
 kind text not null check(kind in ('journal','inspiration')),
 entity_id uuid not null, author uuid not null references auth.users on delete cascade,
 fingerprint text not null, image_path text not null, image_bucket text not null, title text not null default '',
 status text not null default 'pending' check(status in ('pending','approved','rejected','canceled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 reviewer uuid references auth.users on delete set null, primary key(kind,entity_id)
);
alter table private.publication_reviews enable row level security;
revoke all on private.publication_reviews from public,anon,authenticated,service_role;
create function private.publication_fingerprint(p jsonb) returns text language sql immutable set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_object('title',coalesce(p->>'title',p->'snapshot'->>'title'),
 'tags',p->'snapshot'->'publicTags','media',p->>'media_path','publicMedia',p->>'public_media_path')::text,'UTF8')),'hex')
$$;
create function private.guard_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare requested boolean; k text; fp text; approved boolean; title_value text;
begin
 k:=case when tg_table_name='journal_entries' then 'journal' else 'inspiration' end;
 requested:=case when k='journal' then to_jsonb(new)->>'visibility'='public' else (to_jsonb(new)->>'is_public')::boolean end;
 if tg_op='DELETE' then delete from private.publication_reviews where kind=k and entity_id=old.id;return old;end if;
 title_value:=coalesce(to_jsonb(new)->>'title',new.snapshot->>'title','');
 if requested and title_value ~* '(kill yourself|suicide-toi|heil hitler|pornographie infantile)' then raise exception 'content_not_allowed';end if;
 if not requested then
  update private.publication_reviews set status='canceled',updated_at=now() where kind=k and entity_id=new.id and status='pending';
  return new;
 end if;
 if new.media_path is null and new.public_media_path is null then return new;end if;
 fp:=private.publication_fingerprint(to_jsonb(new));
 select status='approved' and fingerprint=fp into approved from private.publication_reviews where kind=k and entity_id=new.id;
 if approved then new.snapshot:=new.snapshot||'{"publicationStatus":"approved"}';return new;end if;
 insert into private.publication_reviews(kind,entity_id,author,fingerprint,image_path,image_bucket,title,status)
 values(k,new.id,new.created_by,fp,coalesce(new.media_path,new.public_media_path),case when new.media_path is not null then 'nailmoods-private' else 'nailmoods-public' end,left(title_value,160),'pending')
 on conflict(kind,entity_id) do update set fingerprint=excluded.fingerprint,image_path=excluded.image_path,image_bucket=excluded.image_bucket,title=excluded.title,status='pending',updated_at=now(),reviewer=null;
 if k='journal' then new.visibility:='private';new.snapshot:=new.snapshot||'{"visibility":"private","publicationStatus":"pending"}';
 else new.is_public:=false;new.snapshot:=new.snapshot||'{"isPublic":false,"publicationStatus":"pending"}';end if;
 return new;
end $$;
create trigger zz_publication_review before insert or update on public.journal_entries for each row execute function private.guard_publication();
create trigger zz_publication_review before insert or update on public.inspirations for each row execute function private.guard_publication();
-- Deletion cleanup is separate so NEW is never dereferenced on DELETE.
create function private.delete_publication_review() returns trigger language plpgsql security definer set search_path='' as $$
begin delete from private.publication_reviews where kind=case when tg_table_name='journal_entries' then 'journal' else 'inspiration' end and entity_id=old.id;return old;end $$;
create trigger publication_review_delete after delete on public.journal_entries for each row execute function private.delete_publication_review();
create trigger publication_review_delete after delete on public.inspirations for each row execute function private.delete_publication_review();
create function public.nm_publication_review(p_action text,p_kind text default null,p_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.publication_reviews; row_data jsonb;
begin
 if p_action='mine' then
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',entity_id,'title',title,'status',status)) from private.publication_reviews where author=auth.uid()),'[]');end if;
 if not private.nm_support_staff() then raise exception 'staff_required' using errcode='42501';end if;
 if p_action='list' then return coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',entity_id,'title',title,'createdAt',created_at)) from (select * from private.publication_reviews where status='pending' order by created_at limit 100) q),'[]');end if;
 select * into r from private.publication_reviews where kind=p_kind and entity_id=p_id for update;
 if not found or r.status<>'pending' then raise exception 'review_unavailable';end if;
 if p_action='preview' then return jsonb_build_object('path',r.image_path,'bucket',r.image_bucket);end if;
 if p_action not in ('approve','reject') then raise exception 'unknown_action';end if;
 if p_kind='journal' then select to_jsonb(j) into row_data from public.journal_entries j where id=p_id for update;
 else select to_jsonb(i) into row_data from public.inspirations i where id=p_id for update;end if;
 if row_data is null or private.publication_fingerprint(row_data)<>r.fingerprint then raise exception 'content_changed';end if;
 update private.publication_reviews set status=case when p_action='approve' then 'approved' else 'rejected' end,reviewer=auth.uid(),updated_at=now() where kind=p_kind and entity_id=p_id;
 if p_action='approve' then
  if p_kind='journal' then update public.journal_entries set visibility='public',snapshot=snapshot||'{"visibility":"public","publicationStatus":"approved"}' where id=p_id;
  else update public.inspirations set is_public=true,snapshot=snapshot||'{"isPublic":true,"publicationStatus":"approved"}' where id=p_id;end if;
 else
  if p_kind='journal' then update public.journal_entries set snapshot=snapshot||'{"publicationStatus":"rejected"}' where id=p_id;
  else update public.inspirations set snapshot=snapshot||'{"publicationStatus":"rejected"}' where id=p_id;end if;
 end if;
 return '{"ok":true}';
end $$;
revoke all on function private.publication_fingerprint(jsonb),private.guard_publication(),private.delete_publication_review() from public,anon,authenticated;
revoke all on function public.nm_publication_review(text,text,uuid) from public,anon;
grant execute on function public.nm_publication_review(text,text,uuid) to authenticated;
-- Text sent through established messaging is filtered before insertion too.
create function private.guard_social_text() returns trigger language plpgsql set search_path='' as $$
begin if (to_jsonb(new)->>'body') ~* '(kill yourself|suicide-toi|heil hitler|pornographie infantile)' then raise exception 'content_not_allowed';end if;return new;end $$;
create trigger social_text_filter before insert or update on public.messages for each row execute function private.guard_social_text();
revoke all on function private.guard_social_text() from public,anon,authenticated;
-- Existing uploaded public photos enter the same queue before Apple review.
update public.journal_entries set visibility=visibility where visibility='public' and (media_path is not null or public_media_path is not null);
update public.inspirations set is_public=is_public where is_public and (media_path is not null or public_media_path is not null);
commit;
