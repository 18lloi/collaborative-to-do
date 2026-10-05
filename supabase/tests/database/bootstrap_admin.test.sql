begin;
select plan(8);

insert into public.admin_bootstrap_emails (email) values ('boss@example.com');

-- Unconfirmed signup with a bootstrap email must stay pending.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'Boss@Example.com');
select is(
  (select approval_status::text || '/' || is_site_admin::text from public.profiles
    where id = '00000000-0000-0000-0000-0000000000a1'),
  'pending/false', 'unconfirmed bootstrap email is not promoted');

-- Confirming it promotes (case-insensitive match).
update auth.users set email_confirmed_at = now()
 where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select approval_status::text || '/' || is_site_admin::text from public.profiles
    where id = '00000000-0000-0000-0000-0000000000a1'),
  'approved/true', 'confirming a bootstrap email makes an approved site admin');

-- Confirmed at signup time also works.
insert into public.admin_bootstrap_emails (email) values ('second@example.com');
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a2', 'second@example.com', now());
select is(
  (select is_site_admin from public.profiles where id = '00000000-0000-0000-0000-0000000000a2'),
  true, 'email confirmed at signup is promoted immediately');

-- Other confirmed users are untouched.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a3', 'someone@example.com', now());
select is(
  (select approval_status::text || '/' || is_site_admin::text from public.profiles
    where id = '00000000-0000-0000-0000-0000000000a3'),
  'pending/false', 'non-listed confirmed users stay pending');

-- Adding an email later promotes an existing confirmed account.
insert into public.admin_bootstrap_emails (email) values ('someone@example.com');
select is(
  (select is_site_admin from public.profiles where id = '00000000-0000-0000-0000-0000000000a3'),
  true, 'adding an email promotes an existing confirmed account');

-- The list itself is not reachable from the API roles.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
select throws_ok($$ select * from public.admin_bootstrap_emails $$, '42501', null,
  'authenticated users cannot read the bootstrap list, even admins');
select throws_ok($$ insert into public.admin_bootstrap_emails values ('evil@example.com') $$,
  '42501', null, 'authenticated users cannot add bootstrap emails');
reset role;
set local role anon;
select throws_ok($$ select * from public.admin_bootstrap_emails $$, '42501', null,
  'anon cannot read the bootstrap list');

select * from finish();
rollback;
