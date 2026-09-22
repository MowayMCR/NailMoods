-- P0.3 dependency fix: the age-protection trigger is shared by inspirations
-- and journal entries.  Access each row shape only in its own trigger branch.
create or replace function private.reject_minor_public_content()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if private.nm_age_band(new.created_by)='15_17' then
    if tg_table_name='inspirations' and new.is_public then
      raise exception 'minor_publication_forbidden' using errcode='42501';
    elsif tg_table_name='journal_entries' and new.visibility='public' then
      raise exception 'minor_publication_forbidden' using errcode='42501';
    end if;
  end if;
  return new;
end $$;
