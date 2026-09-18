begin;
set local search_path = public, extensions;

select plan(22);

insert into auth.users (id, email)
values
  ('44444444-4444-4444-4444-444444444444', 'phase3-owner@example.test'),
  ('55555555-5555-5555-5555-555555555555', 'phase3-other@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select results_eq(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status
    ) values (
      '44444444-4444-4444-4444-444444444444', 'OWNER SERVICE', 'Owner service',
      'Software', 1299, 'USD', 'monthly', '2026-10-01', '2026-01-01', 'active'
    ) returning display_name$$,
  $$values ('Owner service'::text)$$,
  'owner inserts a manual subscription'
);

select results_eq(
  $$select display_name from public.subscriptions$$,
  $$values ('Owner service'::text)$$,
  'owner reads the created subscription'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status
    ) values (
      '55555555-5555-5555-5555-555555555555', 'STOLEN OWNER', 'Stolen owner',
      'Other', 100, 'USD', 'monthly', '2026-10-02', '2026-01-02', 'active'
    )$$,
  '42501',
  null,
  'owner cannot insert for another user'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status, source
    ) values (
      '44444444-4444-4444-4444-444444444444', 'FAKE IMPORT', 'Fake import',
      'Other', 100, 'USD', 'monthly', '2026-10-02', '2026-01-02', 'active',
      'statement_import'
    )$$,
  '42501',
  null,
  'manual inserts cannot assign import provenance'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status
    ) values (
      '44444444-4444-4444-4444-444444444444', 'ZERO PRICE', 'Zero price',
      'Other', 0, 'USD', 'monthly', '2026-10-02', '2026-01-02', 'active'
    )$$,
  '23514',
  null,
  'database rejects a nonpositive amount'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status
    ) values (
      '44444444-4444-4444-4444-444444444444', 'CUSTOM PLAN', 'Custom plan',
      'Other', 100, 'USD', 'custom', '2026-10-02', '2026-01-02', 'active'
    )$$,
  '23514',
  null,
  'database requires a custom interval for custom billing'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status, website
    ) values (
      '44444444-4444-4444-4444-444444444444', 'UNSAFE URL', 'Unsafe URL',
      'Other', 100, 'USD', 'monthly', '2026-10-02', '2026-01-02', 'active',
      'https://user:password@example.test'
    )$$,
  '23514',
  null,
  'database rejects credential-bearing websites'
);

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status
    ) values (
      '44444444-4444-4444-4444-444444444444', 'BAD DATES', 'Bad dates',
      'Other', 100, 'USD', 'monthly', '2025-12-31', '2026-01-01', 'active'
    )$$,
  '23514',
  null,
  'database rejects a next billing date before the start date'
);

select results_eq(
  $$update public.subscriptions
    set display_name = 'Owner service updated'
    where user_id = '44444444-4444-4444-4444-444444444444'
    returning display_name$$,
  $$values ('Owner service updated'::text)$$,
  'owner updates an editable subscription field'
);

select throws_ok(
  $$update public.subscriptions set id = gen_random_uuid()$$,
  '42501',
  null,
  'subscription identifiers are not writable'
);

select throws_ok(
  $$update public.subscriptions
    set user_id = '55555555-5555-5555-5555-555555555555'$$,
  '42501',
  null,
  'subscription ownership is not writable'
);

select ok(
  not has_column_privilege('authenticated', 'public.subscriptions', 'source', 'insert,update')
  and not has_column_privilege('authenticated', 'public.subscriptions', 'source_import_id', 'insert,update')
  and not has_column_privilege('authenticated', 'public.subscriptions', 'confidence_score', 'insert,update')
  and not has_column_privilege('authenticated', 'public.subscriptions', 'created_at', 'insert,update')
  and not has_column_privilege('authenticated', 'public.subscriptions', 'updated_at', 'insert,update'),
  'provenance, confidence, and audit timestamps are not client writable'
);

set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

select is_empty(
  $$select id from public.subscriptions
    where user_id = '44444444-4444-4444-4444-444444444444'$$,
  'another user cannot read the owner subscription'
);

select is_empty(
  $$update public.subscriptions
    set display_name = 'Other changed this'
    where user_id = '44444444-4444-4444-4444-444444444444'
    returning id$$,
  'another user cannot update the owner subscription'
);

reset role;

select results_eq(
  $$select display_name from public.subscriptions
    where user_id = '44444444-4444-4444-4444-444444444444'$$,
  $$values ('Owner service updated'::text)$$,
  'denied cross-user update leaves the owner row intact'
);

set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';

select is_empty(
  $$delete from public.subscriptions
    where user_id = '44444444-4444-4444-4444-444444444444'
    returning id$$,
  'another user cannot delete the owner subscription'
);

reset role;

select results_eq(
  $$select display_name from public.subscriptions
    where user_id = '44444444-4444-4444-4444-444444444444'$$,
  $$values ('Owner service updated'::text)$$,
  'denied cross-user delete leaves the owner row intact'
);

set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

select results_eq(
  $$update public.subscriptions
    set archived_at = now()
    where user_id = '44444444-4444-4444-4444-444444444444'
    returning archived_at is not null$$,
  $$values (true)$$,
  'owner archives their subscription'
);

select results_eq(
  $$delete from public.subscriptions
    where user_id = '44444444-4444-4444-4444-444444444444'
    returning display_name$$,
  $$values ('Owner service updated'::text)$$,
  'owner deletes their local subscription record'
);

reset role;

select ok(
  (
    select count(*) >= 4
    from public.audit_events
    where user_id = '44444444-4444-4444-4444-444444444444'
      and resource_type = 'subscriptions'
      and event_type in (
        'subscriptions.insert',
        'subscriptions.update',
        'subscriptions.delete'
      )
  ),
  'subscription mutations create redacted audit events'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where user_id = '44444444-4444-4444-4444-444444444444'
      and resource_type = 'subscriptions'
      and details <> '{}'::jsonb
  ),
  0,
  'subscription audit events contain no financial details'
);

set local role anon;

select throws_ok(
  $$insert into public.subscriptions (
      user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status
    ) values (
      '44444444-4444-4444-4444-444444444444', 'ANON', 'Anonymous',
      'Other', 100, 'USD', 'monthly', '2026-10-02', '2026-01-02', 'active'
    )$$,
  '42501',
  null,
  'anonymous users cannot insert subscriptions'
);

select * from finish();
rollback;
