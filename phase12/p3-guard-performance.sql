alter policy blocked_share_guard on public.inspiration_shares using(not private.nm_blocked(case when sender_id=(select auth.uid()) then recipient_id else sender_id end));
alter policy blocked_journal_guard on public.journal_entries using(created_by=(select auth.uid()) or not private.nm_blocked(created_by));
alter policy blocked_inspiration_guard on public.inspirations using(created_by=(select auth.uid()) or not private.nm_blocked(created_by));
create index support_tickets_attachment_idx on private.support_tickets(attachment) where attachment is not null;
