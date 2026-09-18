begin;
set local search_path = public, extensions;

select plan(48);

delete from auth.users
where id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.test'),
  ('33333333-3333-3333-3333-333333333333', 'unassigned@example.test');

delete from public.profiles
where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.statement_imports (
  id,
  user_id,
  status,
  file_sha256,
  file_size_bytes,
  row_count
)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'review',
  repeat('b', 64),
  1024,
  3
);

insert into public.subscriptions (
  id,
  user_id,
  merchant_name,
  display_name,
  category,
  amount_minor,
  currency,
  billing_frequency,
  next_billing_date,
  start_date,
  status,
  source
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'FIXTURE SERVICE OWNER',
    'Owner service',
    'Software',
    1299,
    'USD',
    'monthly',
    '2026-10-01',
    '2026-01-01',
    'active',
    'manual'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa',
    '22222222-2222-2222-2222-222222222222',
    'FIXTURE SERVICE OTHER',
    'Other service',
    'Music',
    999,
    'USD',
    'monthly',
    '2026-10-02',
    '2026-01-02',
    'active',
    'manual'
  );

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = any(array[
        'profiles',
        'subscriptions',
        'transactions',
        'statement_imports',
        'import_column_mappings',
        'merchant_aliases',
        'import_suggestions',
        'subscription_price_history',
        'reminders',
        'budgets',
        'savings_goals',
        'cancellation_guides',
        'audit_events'
      ])
      and relation.relrowsecurity
  ),
  13,
  'RLS is enabled on every user-owned table'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anonymous users have no profile read grant'
);

select ok(
  not has_table_privilege('anon', 'public.subscriptions', 'select'),
  'anonymous users have no subscription read grant'
);

select ok(
  has_table_privilege('authenticated', 'public.profiles', 'select')
  and has_column_privilege(
    'authenticated',
    'public.profiles',
    'preferred_currency',
    'update'
  ),
  'authenticated users receive profile read and preference update grants'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'insert')
  and not has_table_privilege('authenticated', 'public.profiles', 'delete'),
  'authenticated users cannot directly create or delete profiles'
);

select ok(
  has_table_privilege('authenticated', 'public.subscriptions', 'select'),
  'authenticated users can read subscriptions through RLS'
);

select ok(
  has_column_privilege('authenticated', 'public.subscriptions', 'display_name', 'insert,update')
  and has_table_privilege('authenticated', 'public.subscriptions', 'delete')
  and not has_column_privilege('authenticated', 'public.subscriptions', 'source', 'insert,update')
  and not has_column_privilege('authenticated', 'public.subscriptions', 'user_id', 'update'),
  'subscription grants expose editable columns but protect provenance and ownership'
);

select ok(
  (
    select bool_and(
      not has_table_privilege(
        'authenticated',
        format('public.%I', table_name),
        'select,insert,update,delete'
      )
    )
    from unnest(array[
      'cancellation_guides',
      'audit_events'
    ]) as table_names(table_name)
  ),
  'remaining future feature tables expose no authenticated role grants'
);

select ok(
  has_table_privilege('authenticated', 'public.budgets', 'select,delete')
  and has_column_privilege('authenticated', 'public.budgets', 'monthly_limit_minor', 'insert,update')
  and has_table_privilege('authenticated', 'public.savings_goals', 'select,delete')
  and has_column_privilege('authenticated', 'public.savings_goals', 'monthly_target_minor', 'insert,update'),
  'authenticated users receive only required onboarding column grants'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'id', 'update')
  and not has_column_privilege('authenticated', 'public.profiles', 'user_id', 'update'),
  'profile identity columns are not writable'
);

select ok(
  not has_column_privilege('authenticated', 'public.budgets', 'id', 'update')
  and not has_column_privilege('authenticated', 'public.budgets', 'user_id', 'update'),
  'budget identity columns are not writable'
);

select ok(
  not has_column_privilege('authenticated', 'public.savings_goals', 'id', 'update')
  and not has_column_privilege('authenticated', 'public.savings_goals', 'user_id', 'update'),
  'savings-goal identity columns are not writable'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.savings_goals',
    'realized_monthly_minor',
    'update'
  ),
  'realized savings cannot be changed through profile preferences'
);

select ok(
  has_function_privilege(
    'authenticated',
    'public.complete_onboarding(text,text,text,boolean,boolean,integer,integer)',
    'execute'
  ),
  'authenticated users can execute the onboarding transaction'
);

select ok(
  not has_function_privilege(
    'anon',
    'public.complete_onboarding(text,text,text,boolean,boolean,integer,integer)',
    'execute'
  ),
  'anonymous users cannot execute the onboarding transaction'
);

select is(
  (select count(*)::integer from public.profiles),
  2,
  'new Auth users receive profiles and the removed fixture profile stays deleted'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where event_type = 'profiles.insert'
  ),
  3,
  'profile creation records one redacted audit event per Auth user'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where event_type = 'subscriptions.insert'
  ),
  2,
  'subscription creation records redacted audit events'
);

set local role anon;

select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'anonymous users cannot query profiles'
);

select throws_ok(
  $$select * from public.subscriptions$$,
  '42501',
  null,
  'anonymous users cannot query subscriptions'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select preferred_currency from public.profiles$$,
  $$values ('USD'::text)$$,
  'an owner reads only their profile'
);

select is_empty(
  $$select user_id from public.profiles where user_id = '22222222-2222-2222-2222-222222222222'$$,
  'an owner cannot read another profile'
);

select results_eq(
  $$update public.profiles set preferred_currency = 'EUR'
    where user_id = '11111111-1111-1111-1111-111111111111'
    returning preferred_currency$$,
  $$values ('EUR'::text)$$,
  'an owner updates their profile'
);

select is_empty(
  $$update public.profiles set preferred_currency = 'GBP'
    where user_id = '22222222-2222-2222-2222-222222222222'
    returning preferred_currency$$,
  'an owner cannot update another profile'
);

select results_eq(
  $$select preferred_currency from public.profiles
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  $$values ('EUR'::text)$$,
  'a denied update leaves the owner profile intact'
);

select results_eq(
  $$select display_name from public.subscriptions$$,
  $$values ('Owner service'::text)$$,
  'an owner reads only their subscription'
);

select is_empty(
  $$select id from public.subscriptions
    where id = 'bbbbbbbb-bbbb-bbbb-bbbb-aaaaaaaaaaaa'$$,
  'an owner cannot read another subscription by a known ID'
);

select results_eq(
  $$insert into public.budgets (user_id, monthly_limit_minor, currency)
    values ('11111111-1111-1111-1111-111111111111', 8500, 'USD')
    returning monthly_limit_minor$$,
  $$values (8500)$$,
  'an owner creates their budget'
);

select results_eq(
  $$insert into public.savings_goals (user_id, monthly_target_minor, currency)
    values ('11111111-1111-1111-1111-111111111111', 2500, 'USD')
    returning monthly_target_minor$$,
  $$values (2500)$$,
  'an owner creates their savings goal'
);

select results_eq(
  $$select monthly_limit_minor from public.budgets$$,
  $$values (8500)$$,
  'an owner reads their budget'
);

select results_eq(
  $$select monthly_target_minor from public.savings_goals$$,
  $$values (2500)$$,
  'an owner reads their savings goal'
);

select public.complete_onboarding(
  'USD',
  'en-US',
  'Europe/Stockholm',
  false,
  true,
  9000,
  3000
);

select results_eq(
  $$select preferred_currency, time_zone, renewal_reminders_enabled,
      onboarding_completed_at is not null
    from public.profiles$$,
  $$values ('USD'::text, 'Europe/Stockholm'::text, false, true)$$,
  'onboarding updates the owner profile'
);

select results_eq(
  $$select monthly_limit_minor from public.budgets$$,
  $$values (9000)$$,
  'onboarding replaces the owner budget'
);

select results_eq(
  $$select monthly_target_minor from public.savings_goals$$,
  $$values (3000)$$,
  'onboarding replaces the owner savings goal'
);

reset role;

select ok(
  (
    select count(*) >= 2
    from public.audit_events
    where user_id = '11111111-1111-1111-1111-111111111111'
      and event_type in ('budgets.update', 'savings_goals.update')
  ),
  'onboarding records redacted budget and savings audit events'
);

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';

select is_empty(
  $$select id from public.budgets$$,
  'another user cannot read the owner budget'
);

select is_empty(
  $$select id from public.savings_goals$$,
  'another user cannot read the owner savings goal'
);

select is_empty(
  $$update public.budgets set monthly_limit_minor = 1 returning id$$,
  'another user cannot update the owner budget'
);

set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select throws_ok(
  $$update public.savings_goals
    set user_id = '22222222-2222-2222-2222-222222222222'$$,
  '42501',
  null,
  'an owner cannot reassign savings-goal ownership'
);

select throws_ok(
  $$update public.profiles
    set user_id = '33333333-3333-3333-3333-333333333333'
    where user_id = '11111111-1111-1111-1111-111111111111'$$,
  '42501',
  null,
  'an owner cannot reassign profile ownership'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status, source
    ) values (
      '11111111-1111-1111-1111-111111111111', 'DIRECT INSERT', 'Direct insert',
      'Other', 100, 'USD', 'monthly', '2026-10-03', '2026-01-03', 'active', 'manual'
    )$$,
  '42501',
  null,
  'manual inserts cannot assign protected source metadata'
);

select ok(
  not has_table_privilege('authenticated', 'public.audit_events', 'select,insert,update,delete'),
  'authenticated users have no direct audit-event privileges'
);

reset role;

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status, source,
      source_import_id
    ) values (
      '11111111-1111-1111-1111-111111111111', 'CROSS OWNER', 'Cross owner',
      'Other', 100, 'USD', 'monthly', '2026-10-04', '2026-01-04', 'active',
      'statement_import', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    )$$,
  '23503',
  null,
  'a subscription cannot reference another owner import'
);

delete from auth.users
where id = '11111111-1111-1111-1111-111111111111';

select is(
  (
    select count(*)::integer
    from public.profiles
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'account deletion removes the profile'
);

select is(
  (
    select count(*)::integer
    from public.subscriptions
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'account deletion removes subscriptions'
);

select is(
  (
    select count(*)::integer
    from public.budgets
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'account deletion removes budgets'
);

select is(
  (
    select count(*)::integer
    from public.savings_goals
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'account deletion removes savings goals'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where user_id = '11111111-1111-1111-1111-111111111111'
  ),
  0,
  'account deletion removes user-linked audit events'
);

select * from finish();
rollback;
