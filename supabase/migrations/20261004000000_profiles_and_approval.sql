-- M1: profiles + approval gate.
-- Every auth user (including anonymous guests) gets a profile that starts `pending`.
-- Access to app data is gated on `approval_status = 'approved'` in RLS, not in the UI.

create type public.approval_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_url text,
  approval_status public.approval_status not null default 'pending',
  is_site_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Helpers used by RLS policies on every table. SECURITY DEFINER so they can read
-- `profiles` regardless of the caller's own policies (avoids recursive RLS).
create function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.approval_status = 'approved' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_site_admin and p.approval_status = 'approved'
       from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Create a pending profile for every new auth user.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Admin action: approve / reject / reset a user. The only way to change approval_status.
create function public.set_approval_status(target_user uuid, new_status public.approval_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    raise exception 'only site admins can change approval status' using errcode = '42501';
  end if;
  update public.profiles set approval_status = new_status where id = target_user;
end;
$$;

-- RLS
alter table public.profiles enable row level security;

-- A user can always read their own row (the UI needs it to show "waiting for approval").
-- Site admins can read every row for the approval screen.
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "site admins read all profiles" on public.profiles
  for select to authenticated
  using (public.is_site_admin());

-- Approved users can edit their own display name and avatar. Column grants below stop
-- anyone from touching approval_status or is_site_admin directly.
create policy "approved users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and public.is_approved())
  with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

revoke all on function public.set_approval_status(uuid, public.approval_status) from public, anon;
grant execute on function public.set_approval_status(uuid, public.approval_status) to authenticated;
revoke all on function public.is_approved() from public, anon;
grant execute on function public.is_approved() to authenticated;
revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;
