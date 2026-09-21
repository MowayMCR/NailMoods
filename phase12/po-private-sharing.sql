-- Recette: private inspiration/journal request sent to a professional workspace.
alter table public.inspiration_shares add column if not exists recipient_workspace_id uuid references public.workspaces on delete cascade;
alter table public.inspiration_shares add column if not exists source_local_id text;
alter table public.inspiration_shares add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table public.inspiration_shares add column if not exists status text not null default 'sent' check(status in ('sent','opened','archived'));
create index if not exists inspiration_shares_recipient_created on public.inspiration_shares(recipient_id,created_at desc);
create index if not exists inspiration_shares_recipient_workspace on public.inspiration_shares(recipient_workspace_id);

create or replace function private.send_nailmoods_share_to_po(p_recipient_workspace_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare recipient uuid; share_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 select w.owner_user_id into recipient from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join public.profiles p on p.id=w.owner_user_id where w.id=p_recipient_workspace_id and w.kind in ('pro','institute','creator') and pp.is_public and p.account_tier='pro';
 if recipient is null or recipient=auth.uid() then raise exception 'invalid_po_recipient' using errcode='22023'; end if;
 if jsonb_typeof(p_snapshot)<>'object' or length(p_snapshot::text)>20000 or p_snapshot ?| array['notes','photo','image','message','prompt','email','address'] then raise exception 'invalid_share_snapshot' using errcode='22023'; end if;
 insert into public.inspiration_shares(inspiration_id,sender_id,recipient_id,recipient_workspace_id,source_local_id,snapshot) values(null,auth.uid(),recipient,p_recipient_workspace_id,left(p_source_local_id,120),p_snapshot) returning id into share_id;
 return share_id;
end $$;
create or replace function private.received_nailmoods_po_shares() returns table(id uuid,sender_handle text,snapshot jsonb,status text,created_at timestamptz) language sql stable security definer set search_path='' as $$
 select s.id,p.username,s.snapshot,s.status,s.created_at from public.inspiration_shares s left join public.profiles p on p.id=s.sender_id where s.recipient_id=auth.uid() order by s.created_at desc limit 100
$$;
revoke all on function private.send_nailmoods_share_to_po(uuid,text,jsonb),private.received_nailmoods_po_shares() from public,anon;
grant execute on function private.send_nailmoods_share_to_po(uuid,text,jsonb),private.received_nailmoods_po_shares() to authenticated;
create or replace function public.send_nailmoods_share_to_po(p_recipient_workspace_id uuid,p_source_local_id text,p_snapshot jsonb) returns uuid language sql security invoker set search_path='' as $$select private.send_nailmoods_share_to_po(p_recipient_workspace_id,p_source_local_id,p_snapshot)$$;
create or replace function public.received_nailmoods_po_shares() returns table(id uuid,sender_handle text,snapshot jsonb,status text,created_at timestamptz) language sql security invoker set search_path='' as $$select * from private.received_nailmoods_po_shares()$$;
revoke all on function public.send_nailmoods_share_to_po(uuid,text,jsonb),public.received_nailmoods_po_shares() from public,anon;
grant execute on function public.send_nailmoods_share_to_po(uuid,text,jsonb),public.received_nailmoods_po_shares() to authenticated;
