-- P0.3 promotion prerequisite.
-- This is deliberately standalone: Production received the P3 support tables,
-- but not the Recette closure table used by the operational moderation RPCs.

alter table private.support_tickets
  add column if not exists priority text not null default 'normal'
  check (priority in ('low','normal','high','urgent'));

alter table private.safety_reports
  add column if not exists priority text not null default 'normal'
  check (priority in ('low','normal','high','urgent'));

create table if not exists private.support_decisions (
  id bigint generated always as identity primary key,
  kind text not null check(kind in ('support','report')),
  item_id uuid not null,
  actor uuid not null references auth.users(id) on delete restrict,
  from_status text,
  to_status text not null check(to_status in ('new','under_review','resolved','dismissed')),
  priority text not null check(priority in ('low','normal','high','urgent')),
  note text not null default '' check(octet_length(note)<=2000),
  created_at timestamptz not null default now()
);

create index if not exists support_decisions_item_idx
  on private.support_decisions(kind,item_id,created_at desc);

alter table private.support_decisions enable row level security;
revoke all on private.support_decisions from public, anon, authenticated;
