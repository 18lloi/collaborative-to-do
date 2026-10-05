begin;
select plan(14);

-- Fixtures: pending user, approved user, rejected user, approved site admin.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'pending@example.com', '{"full_name":"Pat Pending"}'),
  ('00000000-0000-0000-0000-00000000000b', 'approved@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'rejected@example.com', '{}'),
  ('00000000-0000-0000-0000-00000000000d', 'admin@example.com', '{}');

update public.profiles set approval_status = 'approved'
  where id in ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000d');
update public.profiles set approval_status = 'rejected'
  where id = '00000000-0000-0000-0000-00000000000c';
update public.profiles set is_site_admin = true
  where id = '00000000-0000-0000-0000-00000000000d';

-- Signup trigger
select is(
  (select approval_status::text from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'pending', 'new users start pending');
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Pat Pending', 'display name comes from signup metadata');
select is(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'approved', 'display name falls back to the email prefix');

-- Pending user
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select is((select count(*)::int from public.profiles), 1, 'pending user sees only their own profile');
select is((select approval_status::text from public.profiles), 'pending', '...and can read their status');
select is((select public.is_approved()), false, 'pending user is not approved');
select throws_ok(
  $$ update public.profiles set approval_status = 'approved' where id = auth.uid() $$,
  '42501', null, 'user cannot self-approve');
select throws_ok(
  $$ select public.set_approval_status('00000000-0000-0000-0000-00000000000a', 'approved') $$,
  '42501', null, 'non-admin cannot call set_approval_status');

-- Rejected user
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
select is((select public.is_approved()), false, 'rejected user is not approved');

-- Approved (non-admin) user
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 1, 'approved member cannot list other profiles');
select throws_ok(
  $$ update public.profiles set is_site_admin = true where id = auth.uid() $$,
  '42501', null, 'user cannot make themselves site admin');

-- Site admin
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', true);
select is((select count(*)::int from public.profiles), 4, 'site admin sees every profile');
select lives_ok(
  $$ select public.set_approval_status('00000000-0000-0000-0000-00000000000a', 'approved') $$,
  'site admin can approve a user');

-- Anonymous (not signed in)
reset role;
set local role anon;
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon cannot read profiles');

select * from finish();
rollback;
