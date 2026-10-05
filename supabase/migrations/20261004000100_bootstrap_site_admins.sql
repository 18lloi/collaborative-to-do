-- First-admin bootstrap.
-- Emails listed in `admin_bootstrap_emails` become approved site admins as soon as that email
-- is *confirmed* on an auth user (confirmation matters: an unverified signup must not be able
-- to claim an admin address). The list is filled per environment, never committed:
--   local: supabase/seed.local.sql (gitignored)   hosted: run the insert once in the SQL editor.

create table public.admin_bootstrap_emails (
  email text primary key check (email = lower(email))
);

-- Locked down: no RLS policies and no grants, so only the postgres/service role can touch it.
alter table public.admin_bootstrap_emails enable row level security;
revoke all on public.admin_bootstrap_emails from anon, authenticated;

create function public.promote_bootstrap_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is not null
     and exists (
       select 1 from public.admin_bootstrap_emails b where b.email = lower(new.email)
     )
  then
    update public.profiles
       set approval_status = 'approved', is_site_admin = true
     where id = new.id;
  end if;
  return new;
end;
$$;

-- Trigger names sort after `on_auth_user_created`, so the profile row exists when this fires.
create trigger on_auth_user_promote_admin
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.promote_bootstrap_admin();

-- Adding an email later also promotes an account that already exists and is confirmed.
create function public.promote_existing_bootstrap_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
     set approval_status = 'approved', is_site_admin = true
    from auth.users u
   where u.id = p.id
     and lower(u.email) = new.email
     and u.email_confirmed_at is not null;
  return new;
end;
$$;

create trigger on_bootstrap_email_added
  after insert on public.admin_bootstrap_emails
  for each row execute function public.promote_existing_bootstrap_admin();
