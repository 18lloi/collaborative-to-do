-- Admin user management: list users with their emails, and guard self-changes.

-- profiles has no email column on purpose (emails live in auth.users and must not leak to
-- other members). Site admins get them through this function only.
create function public.list_users_for_admin()
returns table (
  id uuid,
  email text,
  display_name text,
  approval_status public.approval_status,
  is_site_admin boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    raise exception 'only site admins can list users' using errcode = '42501';
  end if;
  return query
    select p.id, u.email::text, p.display_name, p.approval_status, p.is_site_admin, p.created_at
      from public.profiles p
      join auth.users u on u.id = p.id
     order by p.created_at desc;
end;
$$;

revoke all on function public.list_users_for_admin() from public, anon;
grant execute on function public.list_users_for_admin() to authenticated;

-- An admin must not be able to lock themselves out by rejecting their own account.
create or replace function public.set_approval_status(target_user uuid, new_status public.approval_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_site_admin() then
    raise exception 'only site admins can change approval status' using errcode = '42501';
  end if;
  if target_user = auth.uid() then
    raise exception 'you cannot change your own approval status' using errcode = '42501';
  end if;
  update public.profiles set approval_status = new_status where id = target_user;
end;
$$;
