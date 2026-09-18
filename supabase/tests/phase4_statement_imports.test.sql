begin;
set local role postgres;
set local search_path = public, extensions;

select plan(32);

insert into auth.users (id, email)
values
  ('66666666-6666-6666-6666-666666666666', 'phase4-owner@example.test'),
  ('77777777-7777-7777-7777-777777777777', 'phase4-other@example.test'),
  ('88888888-8888-8888-8888-888888888888', 'phase4-network@example.test');

create temporary table phase4_state (
  suggestion_id uuid,
  suggestion_updated_at timestamptz,
  import_id uuid
);
grant select on phase4_state to authenticated;

select ok(
  has_column_privilege('authenticated', 'public.statement_imports', 'status', 'select')
  and has_column_privilege('authenticated', 'public.transactions', 'normalized_merchant', 'select')
  and has_column_privilege('authenticated', 'public.import_suggestions', 'decision', 'select'),
  'authenticated users can read the import review tables through RLS'
);

select ok(
  not has_table_privilege('authenticated', 'public.statement_imports', 'insert,update,delete')
  and not has_table_privilege('authenticated', 'public.transactions', 'insert,update,delete')
  and not has_table_privilege('authenticated', 'public.import_suggestions', 'insert,update,delete'),
  'authenticated users cannot write import tables directly'
);

select ok(
  not has_table_privilege('anon', 'public.statement_imports', 'select')
  and not has_table_privilege('anon', 'public.transactions', 'select')
  and not has_table_privilege('anon', 'public.import_suggestions', 'select'),
  'anonymous users have no import table privileges'
);

insert into private.import_attempts (id, user_id, network_sha256)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '66666666-6666-6666-6666-666666666666',
  repeat('a', 64)
);

set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select lives_ok(
  $$select public.create_statement_import(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    repeat('b', 64),
    128,
    jsonb_build_object(
      'dateColumn', 'Date',
      'descriptionColumn', 'Description',
      'amountColumn', 'Amount',
      'debitColumn', null,
      'creditColumn', null,
      'dateFormat', 'iso'
    ),
    jsonb_build_array(
      jsonb_build_object(
        'transactionDate', '2026-06-21',
        'normalizedMerchant', 'NORTHSTAR CINEMA',
        'amountMinor', -1599,
        'currency', 'USD',
        'transactionSha256', repeat('1', 64)
      ),
      jsonb_build_object(
        'transactionDate', '2026-07-21',
        'normalizedMerchant', 'NORTHSTAR CINEMA',
        'amountMinor', -1599,
        'currency', 'USD',
        'transactionSha256', repeat('2', 64)
      ),
      jsonb_build_object(
        'transactionDate', '2026-08-21',
        'normalizedMerchant', 'NORTHSTAR CINEMA',
        'amountMinor', -1899,
        'currency', 'USD',
        'transactionSha256', repeat('3', 64)
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'normalizedMerchant', 'NORTHSTAR CINEMA',
        'displayName', 'Northstar Cinema',
        'amountMinor', 1899,
        'currency', 'USD',
        'billingFrequency', 'monthly',
        'nextBillingDate', '2026-09-21',
        'startDate', '2026-06-21',
        'confidenceScore', 92,
        'reasonCode', 'MONTHLY_VARIABLE',
        'reasonSummary', 'Three charges appeared about one month apart.'
      )
    ),
    'UNDER_100_MS'
  )$$,
  'an owner creates one normalized import atomically'
);

select is(
  (select count(*)::integer from public.statement_imports),
  1,
  'the owner reads one import'
);

select results_eq(
  $$select status::text, row_count, accepted_count
    from public.statement_imports$$,
  $$values ('review'::text, 3, 3)$$,
  'the import enters review with bounded summary counts'
);

select results_eq(
  $$select date_column, amount_column, date_format
    from public.import_column_mappings$$,
  $$values ('Date'::text, 'Amount'::text, 'iso'::text)$$,
  'the validated mapping is retained without source rows'
);

select is(
  (select count(*)::integer from public.transactions),
  3,
  'normalized transactions are retained for review'
);

select results_eq(
  $$select display_name, confidence_score, decision::text
    from public.import_suggestions$$,
  $$values ('Northstar Cinema'::text, 92::smallint, 'pending'::text)$$,
  'the detector output is pending explicit review'
);

select throws_ok(
  $$insert into public.transactions (
      user_id, statement_import_id, transaction_date, normalized_merchant,
      amount_minor, currency, transaction_sha256
    ) values (
      '66666666-6666-6666-6666-666666666666',
      gen_random_uuid(), '2026-01-01', 'FORGED', -100, 'USD', repeat('f', 64)
    )$$,
  '42501',
  null,
  'the owner cannot bypass the import RPC with a direct transaction write'
);

select throws_ok(
  $$select public.create_statement_import(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', repeat('d', 64), 128,
    jsonb_build_object(
      'dateColumn', 'Date', 'descriptionColumn', 'Description',
      'amountColumn', 'Amount', 'debitColumn', null, 'creditColumn', null,
      'dateFormat', 'iso', 'unusedPadding', repeat('x', 9000)
    ),
    '[]'::jsonb, '[]'::jsonb, 'UNDER_100_MS'
  )$$,
  '22023',
  'INVALID_IMPORT_PAYLOAD',
  'the database bounds direct RPC JSON independently of the upload route'
);

select throws_ok(
  $$select public.begin_statement_import_attempt(repeat('a', 64))$$,
  'P0001',
  'ACTIVE_IMPORT_EXISTS',
  'one active import blocks another upload before body processing'
);

set local role postgres;

insert into phase4_state (suggestion_id, suggestion_updated_at, import_id)
select id, updated_at, statement_import_id
from public.import_suggestions
where user_id = '66666666-6666-6666-6666-666666666666';

set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

select is_empty(
  $$select id from public.statement_imports
    where id = (select import_id from phase4_state)$$,
  'another user cannot read a known import ID'
);

select is_empty(
  $$select id from public.import_suggestions
    where id = (select suggestion_id from phase4_state)$$,
  'another user cannot read a known suggestion ID'
);

select throws_ok(
  $$select public.update_import_suggestion(
    (select suggestion_id from phase4_state),
    (select suggestion_updated_at from phase4_state),
    'Cross-user edit', 1999, 'monthly', '2026-09-21', '2026-06-21'
  )$$,
  'P0001',
  'IMPORT_CONFLICT',
  'another user cannot edit a known suggestion ID'
);

set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select lives_ok(
  $$select public.update_import_suggestion(
    (select suggestion_id from phase4_state),
    (select suggestion_updated_at from phase4_state),
    'Northstar Plus', 1999, 'monthly', '2026-09-21', '2026-06-21'
  )$$,
  'the owner edits a pending suggestion with its current version'
);

select throws_ok(
  $$select public.update_import_suggestion(
    (select suggestion_id from phase4_state),
    (select suggestion_updated_at from phase4_state),
    'Stale edit', 2099, 'monthly', '2026-09-21', '2026-06-21'
  )$$,
  'P0001',
  'IMPORT_CONFLICT',
  'a stale suggestion edit cannot overwrite a newer value'
);

set local role postgres;
update phase4_state
set suggestion_updated_at = (
  select updated_at from public.import_suggestions
  where id = phase4_state.suggestion_id
);
set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select lives_ok(
  $$select public.approve_import_suggestion(
    (select suggestion_id from phase4_state),
    (select suggestion_updated_at from phase4_state),
    'Video streaming'
  )$$,
  'the owner explicitly approves the edited suggestion'
);

select results_eq(
  $$select display_name, amount_minor, source::text, confidence_score
    from public.subscriptions
    where source_import_id = (select import_id from phase4_state)$$,
  $$values ('Northstar Plus'::text, 1999, 'statement_import'::text, 92::smallint)$$,
  'approval creates a subscription with server-controlled provenance'
);

select is(
  (
    select count(*)::integer from public.transactions
    where subscription_id is not null
  ),
  3,
  'approval links only the matching normalized transactions'
);

select results_eq(
  $$select status::text, completed_at is not null
    from public.statement_imports
    where id = (select import_id from phase4_state)$$,
  $$values ('completed'::text, true)$$,
  'the import completes when no pending decisions remain'
);

set local role postgres;

select is(
  (
    select count(*)::integer
    from public.audit_events
    where user_id = '66666666-6666-6666-6666-666666666666'
      and event_type = 'statement_import.created'
      and details ? 'row_count'
      and details ? 'suggestion_count'
      and details ? 'duration_bucket'
  ),
  1,
  'import creation records only bounded operational metadata'
);

select is(
  (
    select count(*)::integer
    from public.audit_events
    where user_id = '66666666-6666-6666-6666-666666666666'
      and details::text ilike '%northstar%'
  ),
  0,
  'audit metadata contains no merchant description'
);

insert into private.import_attempts (id, user_id, network_sha256)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '66666666-6666-6666-6666-666666666666',
  repeat('a', 64)
);

set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select throws_ok(
  $$select public.create_statement_import(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', repeat('b', 64), 128,
    '{"dateColumn":"Date","descriptionColumn":"Description","amountColumn":"Amount","debitColumn":null,"creditColumn":null,"dateFormat":"iso"}'::jsonb,
    '[{"transactionDate":"2026-08-21","normalizedMerchant":"OTHER","amountMinor":-100,"currency":"USD","transactionSha256":"4444444444444444444444444444444444444444444444444444444444444444"}]'::jsonb,
    '[]'::jsonb, 'UNDER_100_MS'
  )$$,
  '23505',
  null,
  'the database rejects a duplicate user-scoped file fingerprint'
);

set local role postgres;

insert into private.import_attempts (id, user_id, network_sha256)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '66666666-6666-6666-6666-666666666666',
  repeat('c', 64)
);

set local role authenticated;
set local request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';

select throws_ok(
  $$select public.create_statement_import(
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc', repeat('c', 64), 128,
    '{"dateColumn":"Date","descriptionColumn":"Description","amountColumn":"Amount","debitColumn":null,"creditColumn":null,"dateFormat":"iso"}'::jsonb,
    '[{"transactionDate":"2026-06-21","normalizedMerchant":"NORTHSTAR CINEMA","amountMinor":-1599,"currency":"USD","transactionSha256":"1111111111111111111111111111111111111111111111111111111111111111"}]'::jsonb,
    '[]'::jsonb, 'UNDER_100_MS'
  )$$,
  '23505',
  null,
  'the database rejects a duplicate user-scoped transaction fingerprint'
);

set local role postgres;

select is(
  (
    select count(*)::integer from public.statement_imports
    where user_id = '66666666-6666-6666-6666-666666666666'
  ),
  1,
  'failed duplicate imports roll back their parent rows'
);

set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

select lives_ok(
  $$select public.begin_statement_import_attempt(repeat('d', 64))$$,
  'an authenticated user can receive an opaque import permit'
);

set local role postgres;

insert into private.import_attempts (user_id, network_sha256)
select '77777777-7777-7777-7777-777777777777', repeat('d', 64)
from generate_series(1, 4);

set local role authenticated;
set local request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';

select throws_ok(
  $$select public.begin_statement_import_attempt(repeat('e', 64))$$,
  'P0001',
  'ACCOUNT_RATE_LIMIT',
  'the database enforces five import attempts per account per hour'
);

set local role postgres;

insert into private.import_attempts (user_id, network_sha256)
select '66666666-6666-6666-6666-666666666666', repeat('e', 64)
from generate_series(1, 25);

set local role authenticated;
set local request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';

select throws_ok(
  $$select public.begin_statement_import_attempt(repeat('e', 64))$$,
  'P0001',
  'NETWORK_RATE_LIMIT',
  'the database applies a network-aware rolling-hour limit'
);

set local role anon;

select throws_ok(
  $$select public.begin_statement_import_attempt(repeat('f', 64))$$,
  '42501',
  null,
  'anonymous callers cannot begin an import attempt'
);

select throws_ok(
  $$select public.discard_statement_import('00000000-0000-4000-8000-000000000000')$$,
  '42501',
  null,
  'anonymous callers cannot invoke import mutations'
);

set local role postgres;

select is(
  (
    select count(*)::integer from private.import_attempts
    where safe_result_code is not null
      and safe_result_code !~ '^[A-Z0-9_]{1,64}$'
  ),
  0,
  'import-attempt records contain only safe result codes'
);

select * from finish();
rollback;