begin;
select plan(7);

insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000b1', 'admin@example.com', now()),
  ('00000000-0000-0000-0000-0000000000b2', 'member@example.com', now()),
  ('00000000-0000-0000-0000-0000000000b3', 'newbie@example.com', now());
update public.profiles set approval_status = 'approved', is_site_admin = true
  where id = '00000000-0000-0000-0000-0000000000b1';
update public.profiles set approval_status = 'approved'
  where id = '00000000-0000-0000-0000-0000000000b2';

-- Regular approved member
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', true);
select throws_ok($$ select * from public.list_users_for_admin() $$, '42501', null,
  'members cannot list users');

-- Site admin
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true);
select is((select count(*)::int from public.list_users_for_admin()), 3, 'admin lists every user');
select is(
  (select email from public.list_users_for_admin()
    where id = '00000000-0000-0000-0000-0000000000b3'),
  'newbie@example.com', 'admin sees emails');
select is(
  (select approval_status::text from public.list_users_for_admin()
    where id = '00000000-0000-0000-0000-0000000000b3'),
  'pending', 'new signups show as pending');
select throws_ok(
  $$ select public.set_approval_status('00000000-0000-0000-0000-0000000000b1', 'rejected') $$,
  '42501', null, 'admin cannot change their own status');
select lives_ok(
  $$ select public.set_approval_status('00000000-0000-0000-0000-0000000000b3', 'rejected') $$,
  'admin can reject another user');

-- Not signed in
reset role;
set local role anon;
select throws_ok($$ select * from public.list_users_for_admin() $$, '42501', null,
  'anon cannot list users');

select * from finish();
rollback;
