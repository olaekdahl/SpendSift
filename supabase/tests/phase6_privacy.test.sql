begin;
set local role postgres;
set local search_path = public, extensions;

select plan(36);

delete from private.account_deletion_receipts;

insert into auth.users (id, email)
values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'phase6-owner@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'phase6-other@example.test');

insert into public.subscriptions (
  id, user_id, merchant_name, display_name, category, amount_minor, currency,
  billing_frequency, next_billing_date, start_date, status
) values
  (
    '11111111-bbbb-4bbb-8bbb-111111111111',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'OWNER SERVICE', 'Owner private service', 'Software', 1299, 'USD',
    'monthly', '2026-11-01', '2026-01-01', 'active'
  ),
  (
    '22222222-bbbb-4bbb-8bbb-222222222222',
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'OTHER SERVICE', 'Other private service', 'Software', 999, 'USD',
    'monthly', '2026-11-01', '2026-01-01', 'active'
  );

create temporary table phase6_state (
  guide_updated_at timestamptz,
  export_attempt_id uuid,
  export_data jsonb,
  stale_attempt_id uuid,
  delete_attempt_id uuid
);
insert into phase6_state default values;
grant select, update on phase6_state to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'owner-initial-session'
  )::text,
  true
);

select lives_ok(
  $$select public.save_cancellation_guide(
    '11111111-bbbb-4bbb-8bbb-111111111111', null,
    'https://example.test/account/cancel', '+1 (555) 010-2000',
    E'Open account settings.\nConfirm with the provider.',
    '2026-09-17', 'Fictional owner note.'
  )$$,
  'the owner creates a cancellation guide through the controlled function'
);

select results_eq(
  $$select cancellation_url, phone_number, verified_at
    from public.cancellation_guides$$,
  $$values (
    'https://example.test/account/cancel'::text,
    '+1 (555) 010-2000'::text,
    '2026-09-17'::date
  )$$,
  'the owner reads the validated guide through RLS'
);

select throws_ok(
  $$insert into public.cancellation_guides (
      user_id, subscription_id, instructions
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-bbbb-4bbb-8bbb-111111111111', 'Bypass'
    )$$,
  '42501',
  null,
  'cancellation guides cannot be written directly'
);

select throws_ok(
  $$select public.save_cancellation_guide(
    '11111111-bbbb-4bbb-8bbb-111111111111',
    (select updated_at from public.cancellation_guides),
    'https://user:password@example.test', null, null, null, null
  )$$,
  '23514',
  null,
  'the database rejects a credential-bearing cancellation URL'
);

set local role postgres;
update phase6_state
set guide_updated_at = (
  select updated_at from public.cancellation_guides
  where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'other-session'
  )::text,
  true
);

select is_empty(
  $$select id from public.cancellation_guides
    where subscription_id = '11111111-bbbb-4bbb-8bbb-111111111111'$$,
  'another user cannot read a known guide'
);

select throws_ok(
  $$select public.save_cancellation_guide(
    '11111111-bbbb-4bbb-8bbb-111111111111',
    (select guide_updated_at from phase6_state),
    null, null, 'Cross-user edit', null, null
  )$$,
  'P0001',
  'GUIDE_CONFLICT',
  'another user cannot edit a known subscription guide'
);

set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","iat":0}';

select throws_ok(
  $$select public.begin_account_action('download', repeat('a', 64))$$,
  '22023',
  'INVALID_ACCOUNT_ACTION',
  'account permits reject unknown action names'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'owner-initial-session'
  )::text,
  true
);

select lives_ok(
  $$update phase6_state
    set export_attempt_id = public.begin_account_action('export', repeat('a', 64))$$,
  'the owner obtains a bounded export permit'
);

select throws_ok(
  $$select public.export_current_user_data(export_attempt_id)
    from phase6_state$$,
  '42501',
  'ACCOUNT_REAUTH_REQUIRED',
  'the same Auth session cannot consume a sensitive-action permit'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'owner-export-reauth-session'
  )::text,
  true
);

select lives_ok(
  $$update phase6_state
    set export_data = public.export_current_user_data(export_attempt_id)$$,
  'a recent authenticated owner exports the data document once'
);

select is(
  (select (export_data ->> 'schema_version')::integer from phase6_state),
  1,
  'the export document has an explicit schema version'
);

select is(
  (select export_data::text like '%Owner private service%' from phase6_state),
  true,
  'the export contains the owner record'
);

select is(
  (select export_data::text like '%Other private service%' from phase6_state),
  false,
  'the export excludes another user record'
);

select throws_ok(
  $$select public.export_current_user_data(export_attempt_id)
    from phase6_state$$,
  '42501',
  'INVALID_ACCOUNT_ACTION_PERMIT',
  'an export permit cannot be reused'
);

set local role postgres;

select is(
  (
    select count(*)::integer from public.audit_events
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      and event_type = 'account.exported'
      and details = '{}'::jsonb
  ),
  1,
  'export creates one content-free audit event'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint - 301,
    'session_id', 'owner-stale-session'
  )::text,
  true
);

select lives_ok(
  $$update phase6_state
    set stale_attempt_id = public.begin_account_action('export', repeat('b', 64))$$,
  'an authenticated session can request a permit before reauthentication'
);

select throws_ok(
  $$select public.export_current_user_data(stale_attempt_id)
    from phase6_state$$,
  '42501',
  'RECENT_AUTH_REQUIRED',
  'a stale JWT cannot use an export permit'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'owner-after-stale-session'
  )::text,
  true
);

select lives_ok(
  $$select public.save_cancellation_guide(
    '11111111-bbbb-4bbb-8bbb-111111111111',
    (select guide_updated_at from phase6_state),
    'https://example.test/new-cancel', null, 'Updated instructions',
    '2026-09-18', null
  )$$,
  'the owner updates the guide with the current version'
);

select throws_ok(
  $$select public.save_cancellation_guide(
    '11111111-bbbb-4bbb-8bbb-111111111111',
    (select guide_updated_at from phase6_state),
    null, null, 'Stale edit', null, null
  )$$,
  'P0001',
  'GUIDE_CONFLICT',
  'a stale guide edit cannot overwrite a newer value'
);

set local role postgres;

select is(
  (
    select count(*)::integer from public.audit_events
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      and resource_type = 'cancellation_guides'
      and details = '{}'::jsonb
  ),
  2,
  'guide changes create content-free audit events'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'owner-before-delete-session'
  )::text,
  true
);

select lives_ok(
  $$update phase6_state
    set delete_attempt_id = public.begin_account_action('delete', repeat('c', 64))$$,
  'the owner obtains a bounded deletion permit'
);

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'owner-delete-reauth-session'
  )::text,
  true
);

select throws_ok(
  $$select public.delete_current_user(
    delete_attempt_id, 'delete'
  ) from phase6_state$$,
  '22023',
  'INVALID_DELETE_CONFIRMATION',
  'account deletion requires the exact confirmation phrase'
);

select lives_ok(
  $$select public.delete_current_user(
    delete_attempt_id, 'DELETE MY ACCOUNT'
  ) from phase6_state$$,
  'a recently authenticated owner deletes the current account'
);

set local role postgres;

select is(
  (
    select count(*)::integer from auth.users
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  0,
  'the deleted Auth user no longer exists'
);

select is(
  (
    select count(*)::integer
    from public.profiles
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) + (
    select count(*)::integer
    from public.subscriptions
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) + (
    select count(*)::integer
    from public.cancellation_guides
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) + (
    select count(*)::integer
    from public.audit_events
    where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ),
  0,
  'account deletion cascades representative owner rows and audit events'
);

select is(
  (
    select count(*)::integer from private.account_deletion_receipts
  ),
  1,
  'account deletion keeps one content-free anonymous receipt'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'account_deletion_receipts'
      and column_name in ('user_id', 'email', 'details')
  ),
  'the deletion receipt has no user identity or detail column'
);

select is(
  (
    select count(*)::integer from auth.users
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  1,
  'deleting one account leaves the other account intact'
);

select is(
  (
    select count(*)::integer from public.subscriptions
    where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ),
  1,
  'deleting one account leaves the other account data intact'
);

select ok(
  not has_table_privilege(
    'authenticated', 'public.cancellation_guides', 'insert,update,delete'
  ),
  'cancellation guide writes remain RPC-only'
);

select ok(
  not has_table_privilege(
    'authenticated', 'private.account_deletion_receipts', 'select'
  ),
  'client roles cannot read deletion receipts'
);

insert into auth.users (id, email)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'phase6-limit@example.test');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'limit-session'
  )::text,
  true
);

select lives_ok(
  $$select public.begin_account_action('export', repeat('d', 64)) from generate_series(1, 5)$$,
  'five account export attempts are allowed in one hour'
);

select throws_ok(
  $$select public.begin_account_action('export', repeat('d', 64))$$,
  'P0001',
  'ACCOUNT_ACTION_RATE_LIMIT',
  'the sixth account export attempt is rate limited'
);

set local role postgres;

insert into private.account_action_attempts (
  user_id, action_name, auth_session_id, network_sha256
)
select
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'delete',
  'other-rate-session',
  repeat('e', 64)
from generate_series(1, 20);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    'iat', floor(extract(epoch from clock_timestamp()))::bigint,
    'session_id', 'network-limit-session'
  )::text,
  true
);

select throws_ok(
  $$select public.begin_account_action('delete', repeat('e', 64))$$,
  'P0001',
  'ACCOUNT_ACTION_NETWORK_LIMIT',
  'sensitive account actions enforce the shared network limit'
);

set local role anon;

select throws_ok(
  $$select public.begin_account_action('export', repeat('e', 64))$$,
  '42501',
  null,
  'anonymous callers cannot begin account actions'
);

select throws_ok(
  $$select public.save_cancellation_guide(
    '22222222-bbbb-4bbb-8bbb-222222222222', null,
    null, null, 'Anonymous edit', null, null
  )$$,
  '42501',
  null,
  'anonymous callers cannot save cancellation guides'
);

select * from finish();
rollback;