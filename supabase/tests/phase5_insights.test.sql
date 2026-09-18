begin;
set local search_path = public, extensions;

select plan(53);

insert into auth.users (id, email)
values
  ('99999999-9999-4999-8999-999999999999', 'phase5-owner@example.test'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'phase5-other@example.test');

update public.profiles
set time_zone = 'America/New_York'
where user_id = '99999999-9999-4999-8999-999999999999';

create temporary table phase5_state (
  reminder_id uuid,
  reminder_updated_at timestamptz,
  price_updated_at timestamptz,
  below_updated_at timestamptz,
  cancellation_updated_at timestamptz
);
grant select on phase5_state to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select is(
  (select overlap_threshold from public.profiles),
  2::smallint,
  'profiles default to a two-service overlap threshold'
);

select lives_ok(
  $$select public.save_profile_preferences(
    'USD', 'en-US', 'America/New_York', true, true, 3::smallint, null, null
  )$$,
  'the owner configures the overlap threshold through atomic preferences'
);

select throws_ok(
  $$select public.save_profile_preferences(
    'USD', 'en-US', 'America/New_York', true, true, 6::smallint, null, null
  )$$,
  '22023',
  'INVALID_OVERLAP_THRESHOLD',
  'the database rejects an unsafe overlap threshold'
);

select throws_ok(
  $$update public.profiles set overlap_threshold = 4$$,
  '42501',
  null,
  'the overlap threshold is not directly writable'
);

reset role;

select lives_ok(
  $$insert into public.subscriptions (
      id, user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, status, reminder_lead_days
    ) values (
      '11111111-aaaa-4aaa-8aaa-111111111111',
      '99999999-9999-4999-8999-999999999999',
      'ANNUAL SOFTWARE', 'Annual software', 'Software', 1000, 'USD',
      'annual', '2026-12-20', '2025-12-20', 'active', 7
    )$$,
  'an owner creates a subscription that generates a reminder'
);

select is(
  (
    select count(*)::integer from public.reminders
    where subscription_id = '11111111-aaaa-4aaa-8aaa-111111111111'
      and reminder_type = 'annual_renewal'
  ),
  1,
  'an annual subscription receives one pending annual reminder'
);

select results_eq(
  $$select to_char(due_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI')
    from public.reminders
    where subscription_id = '11111111-aaaa-4aaa-8aaa-111111111111'$$,
  $$values ('2026-12-13 14:00'::text)$$,
  'the reminder converts local 09:00 through the profile time zone'
);

select lives_ok(
  $$insert into public.subscriptions (
      id, user_id, merchant_name, display_name, category, amount_minor, currency,
      billing_frequency, next_billing_date, start_date, trial_end_date, status,
      reminder_lead_days
    ) values (
      '22222222-aaaa-4aaa-8aaa-222222222222',
      '99999999-9999-4999-8999-999999999999',
      'TRIAL SERVICE', 'Trial service', 'Software', 800, 'USD',
      'monthly', '2026-11-20', '2026-10-01', '2026-10-15', 'trial', 3
    )$$,
  'a trial subscription is accepted'
);

select is(
  (
    select count(*)::integer from public.reminders
    where subscription_id = '22222222-aaaa-4aaa-8aaa-222222222222'
      and reminder_type in ('renewal', 'trial_ending')
  ),
  2,
  'a trial receives distinct renewal and trial-ending reminders'
);

set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select lives_ok(
  $$select public.save_profile_preferences(
    'USD', 'en-US', 'America/New_York', true, true, 3::smallint, null, null
  )$$,
  'saving preferences refreshes derived in-app reminders'
);

select is(
  (select count(*)::integer from public.reminders),
  3,
  'reminder refresh is idempotent'
);

select is(
  (select count(*)::integer from public.reminders where status = 'pending'),
  3,
  'the owner reads only their pending reminders'
);

select throws_ok(
  $$update public.reminders set status = 'dismissed'$$,
  '42501',
  null,
  'reminders cannot be updated directly'
);

reset role;

insert into phase5_state (reminder_id, reminder_updated_at)
select id, updated_at
from public.reminders
where subscription_id = '11111111-aaaa-4aaa-8aaa-111111111111';

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is_empty(
  $$select id from public.reminders
    where id = (select reminder_id from phase5_state)$$,
  'another user cannot read a known reminder ID'
);

select throws_ok(
  $$select public.set_reminder_status(
    (select reminder_id from phase5_state),
    (select reminder_updated_at from phase5_state),
    'read'
  )$$,
  'P0001',
  'INSIGHT_CONFLICT',
  'another user cannot mutate a known reminder ID'
);

set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select lives_ok(
  $$select public.set_reminder_status(
    (select reminder_id from phase5_state),
    (select reminder_updated_at from phase5_state),
    'read'
  )$$,
  'the owner marks a current reminder as read'
);

select throws_ok(
  $$select public.set_reminder_status(
    (select reminder_id from phase5_state),
    (select reminder_updated_at from phase5_state),
    'dismissed'
  )$$,
  'P0001',
  'INSIGHT_CONFLICT',
  'a stale reminder action cannot overwrite a newer state'
);

select results_eq(
  $$select status::text, read_at is not null
    from public.reminders
    where id = (select reminder_id from phase5_state)$$,
  $$values ('read'::text, true)$$,
  'a read reminder receives a server timestamp'
);

reset role;

insert into public.statement_imports (
  id, user_id, status, file_sha256, file_size_bytes, row_count, accepted_count,
  completed_at
) values (
  '33333333-aaaa-4aaa-8aaa-333333333333',
  '99999999-9999-4999-8999-999999999999',
  'completed', repeat('a', 64), 100, 2, 2, now()
);

insert into public.subscriptions (
  id, user_id, merchant_name, display_name, category, amount_minor, currency,
  billing_frequency, next_billing_date, start_date, status
) values
  (
    '44444444-aaaa-4aaa-8aaa-444444444444',
    '99999999-9999-4999-8999-999999999999',
    'PRICE SERVICE', 'Price service', 'Software', 1000, 'USD',
    'monthly', '2026-10-01', '2026-01-01', 'active'
  ),
  (
    '55555555-aaaa-4aaa-8aaa-555555555555',
    '99999999-9999-4999-8999-999999999999',
    'ROUNDING SERVICE', 'Rounding service', 'Software', 1000, 'USD',
    'monthly', '2026-10-01', '2026-01-01', 'active'
  );

insert into public.transactions (
  id, user_id, statement_import_id, subscription_id, transaction_date,
  normalized_merchant, amount_minor, currency, transaction_sha256
) values
  (
    '66666666-aaaa-4aaa-8aaa-666666666666',
    '99999999-9999-4999-8999-999999999999',
    '33333333-aaaa-4aaa-8aaa-333333333333',
    '44444444-aaaa-4aaa-8aaa-444444444444',
    '2026-09-01', 'PRICE SERVICE', -1200, 'USD', repeat('b', 64)
  ),
  (
    '77777777-aaaa-4aaa-8aaa-777777777777',
    '99999999-9999-4999-8999-999999999999',
    '33333333-aaaa-4aaa-8aaa-333333333333',
    '55555555-aaaa-4aaa-8aaa-555555555555',
    '2026-09-01', 'ROUNDING SERVICE', -1020, 'USD', repeat('c', 64)
  );

insert into public.import_suggestions (
  id, user_id, statement_import_id, normalized_merchant, display_name,
  amount_minor, currency, billing_frequency, next_billing_date, start_date,
  confidence_score, reason_code, reason_summary
) values (
  '88888888-aaaa-4aaa-8aaa-888888888888',
  '99999999-9999-4999-8999-999999999999',
  '33333333-aaaa-4aaa-8aaa-333333333333',
  'DEFERRED SERVICE', 'Deferred service', 900, 'USD', 'monthly',
  '2026-10-05', '2026-07-05', 90, 'MONTHLY_STABLE',
  'Three charges appeared about one month apart.'
);

select is(
  (
    select count(*)::integer from public.reminders
    where subscription_id = '44444444-aaaa-4aaa-8aaa-444444444444'
      and reminder_type = 'price_increase'
      and status = 'pending'
  ),
  1,
  'a linked charge above tolerance generates one price-increase reminder'
);

update phase5_state
set price_updated_at = (
      select updated_at from public.subscriptions
      where id = '44444444-aaaa-4aaa-8aaa-444444444444'
    ),
    below_updated_at = (
      select updated_at from public.subscriptions
      where id = '55555555-aaaa-4aaa-8aaa-555555555555'
    );

set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select lives_ok(
  $$select public.set_import_suggestion_decision(
    '88888888-aaaa-4aaa-8aaa-888888888888',
    (select updated_at from public.import_suggestions
      where id = '88888888-aaaa-4aaa-8aaa-888888888888'),
    'deferred'
  )$$,
  'deferring an import suggestion succeeds'
);

select is(
  (
    select count(*)::integer from public.reminders
    where import_suggestion_id = '88888888-aaaa-4aaa-8aaa-888888888888'
      and reminder_type = 'review_later'
      and status = 'pending'
  ),
  1,
  'a deferred review creates one owner-scoped in-app reminder'
);

select lives_ok(
  $$select public.confirm_subscription_price_change(
    '44444444-aaaa-4aaa-8aaa-444444444444',
    (select price_updated_at from phase5_state),
    1200
  )$$,
  'the owner confirms a database-derived price change'
);

select results_eq(
  $$select previous_amount_minor, new_amount_minor, percentage_basis_points,
      confirmed_at is not null, source_transaction_id
    from public.subscription_price_history$$,
  $$values (
    1000, 1200, 2000, true,
    '66666666-aaaa-4aaa-8aaa-666666666666'::uuid
  )$$,
  'confirmed history stores exact integer amounts, basis points, and source'
);

select is(
  (
    select amount_minor from public.subscriptions
    where id = '44444444-aaaa-4aaa-8aaa-444444444444'
  ),
  1200,
  'price confirmation updates the subscription atomically'
);

select is(
  (
    select count(*)::integer from public.reminders
    where subscription_id = '44444444-aaaa-4aaa-8aaa-444444444444'
      and reminder_type = 'price_increase'
      and status = 'pending'
  ),
  0,
  'price confirmation removes the pending price reminder'
);

select throws_ok(
  $$insert into public.subscription_price_history (
      user_id, subscription_id, previous_amount_minor, new_amount_minor,
      percentage_basis_points
    ) values (
      '99999999-9999-4999-8999-999999999999',
      '44444444-aaaa-4aaa-8aaa-444444444444', 1200, 1400, 1667
    )$$,
  '42501',
  null,
  'price history cannot be inserted directly'
);

reset role;

select throws_ok(
  $$insert into public.subscription_price_history (
      user_id, subscription_id, previous_amount_minor, new_amount_minor,
      percentage_basis_points
    ) values (
      '99999999-9999-4999-8999-999999999999',
      '44444444-aaaa-4aaa-8aaa-444444444444', 1, 52, 510000
    )$$,
  '23514',
  null,
  'price history rejects implausible basis-point values'
);

select ok(
  not has_column_privilege(
    'authenticated', 'public.subscriptions', 'provider_cancelled_at', 'update'
  )
  and not has_column_privilege(
    'authenticated', 'public.subscriptions', 'realized_monthly_minor', 'update'
  ),
  'provider confirmation and realized savings are not directly writable'
);

select ok(
  not has_function_privilege(
    'authenticated', 'public.refresh_user_reminders()', 'execute'
  ),
  'the reminder refresh helper is not directly executable by client roles'
);

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select is_empty(
  $$select id from public.subscription_price_history
    where subscription_id = '44444444-aaaa-4aaa-8aaa-444444444444'$$,
  'another user cannot read known price history'
);

select throws_ok(
  $$select public.confirm_subscription_price_change(
    '55555555-aaaa-4aaa-8aaa-555555555555',
    (select below_updated_at from phase5_state),
    1020
  )$$,
  'P0001',
  'INSIGHT_CONFLICT',
  'another user cannot confirm a known subscription change'
);

set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select throws_ok(
  $$select public.confirm_subscription_price_change(
    '55555555-aaaa-4aaa-8aaa-555555555555',
    (select below_updated_at from phase5_state),
    1020
  )$$,
  'P0001',
  'PRICE_CHANGE_NOT_FOUND',
  'rounding-sized changes remain below the confirmation threshold'
);

select is(
  (
    select amount_minor from public.subscriptions
    where id = '55555555-aaaa-4aaa-8aaa-555555555555'
  ),
  1000,
  'a rejected below-threshold change leaves the subscription unchanged'
);

reset role;

update phase5_state
set cancellation_updated_at = (
  select updated_at from public.subscriptions
  where id = '11111111-aaaa-4aaa-8aaa-111111111111'
);

set local role authenticated;
set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select lives_ok(
  $$select public.save_profile_preferences(
    'USD', 'en-US', 'Europe/Stockholm', true, false, 4::smallint, 12345, 2345
  )$$,
  'profile, budget, goal, threshold, and reminders save atomically'
);

select results_eq(
  $$select profiles.time_zone, profiles.overlap_threshold,
      budgets.monthly_limit_minor, savings_goals.monthly_target_minor
    from public.profiles
    join public.budgets using (user_id)
    join public.savings_goals using (user_id)
    where profiles.user_id = '99999999-9999-4999-8999-999999999999'$$,
  $$values ('Europe/Stockholm'::text, 4::smallint, 12345, 2345)$$,
  'atomic preferences persist every related value together'
);

select throws_ok(
  $$select public.save_profile_preferences(
    'EUR', 'bad locale', 'Not/AZone', true, true, 2::smallint, -1, 100000001
  )$$,
  '22023',
  'INVALID_PROFILE_PREFERENCES',
  'direct RPC callers cannot bypass profile, money, or time-zone validation'
);

select results_eq(
  $$select profiles.preferred_currency, profiles.time_zone,
      budgets.monthly_limit_minor, savings_goals.monthly_target_minor
    from public.profiles
    join public.budgets using (user_id)
    join public.savings_goals using (user_id)
    where profiles.user_id = '99999999-9999-4999-8999-999999999999'$$,
  $$values ('USD'::text, 'Europe/Stockholm'::text, 12345, 2345)$$,
  'invalid preferences roll back all related table changes'
);

select results_eq(
  $$select status::text
    from public.reminders
    where id = (select reminder_id from phase5_state)$$,
  $$values ('read'::text)$$,
  'preference refresh does not resurrect a reminder the owner already read'
);

select is(
  (
    select count(*)::integer from public.reminders
    where subscription_id = '11111111-aaaa-4aaa-8aaa-111111111111'
      and reminder_type = 'annual_renewal'
      and status = 'pending'
  ),
  0,
  'a time-zone preference change does not create a second pending reminder for the same renewal'
);

set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select throws_ok(
  $$select public.confirm_provider_cancellation(
    '11111111-aaaa-4aaa-8aaa-111111111111',
    (select cancellation_updated_at from phase5_state)
  )$$,
  'P0001',
  'INSIGHT_CONFLICT',
  'another user cannot confirm a known subscription cancellation'
);

set local request.jwt.claim.sub = '99999999-9999-4999-8999-999999999999';

select lives_ok(
  $$select public.confirm_provider_cancellation(
    '11111111-aaaa-4aaa-8aaa-111111111111',
    (select cancellation_updated_at from phase5_state)
  )$$,
  'the owner records a provider-confirmed cancellation'
);

select results_eq(
  $$select status::text, provider_cancelled_at is not null,
      realized_monthly_minor
    from public.subscriptions
    where id = '11111111-aaaa-4aaa-8aaa-111111111111'$$,
  $$values ('cancelled'::text, true, 83::bigint)$$,
  'provider confirmation snapshots exact monthly realized savings'
);

select throws_ok(
  $$select public.confirm_provider_cancellation(
    '11111111-aaaa-4aaa-8aaa-111111111111',
    (select cancellation_updated_at from phase5_state)
  )$$,
  'P0001',
  'INSIGHT_CONFLICT',
  'a repeated or stale cancellation confirmation cannot double count'
);

select lives_ok(
  $$update public.subscriptions
    set status = 'cancelled'
    where id = '55555555-aaaa-4aaa-8aaa-555555555555'$$,
  'an owner may still set the local cancelled status independently'
);

select results_eq(
  $$select provider_cancelled_at, realized_monthly_minor
    from public.subscriptions
    where id = '55555555-aaaa-4aaa-8aaa-555555555555'$$,
  $$values (null::timestamptz, null::bigint)$$,
  'local cancelled status alone does not create realized savings'
);

select lives_ok(
  $$update public.subscriptions
    set status = 'active'
    where id = '11111111-aaaa-4aaa-8aaa-111111111111'$$,
  'the owner may reactivate a provider-confirmed record'
);

select results_eq(
  $$select provider_cancelled_at, realized_monthly_minor
    from public.subscriptions
    where id = '11111111-aaaa-4aaa-8aaa-111111111111'$$,
  $$values (null::timestamptz, null::bigint)$$,
  'reactivation clears the realized-savings snapshot'
);

reset role;

select is(
  (
    select count(*)::integer from public.audit_events
    where user_id = '99999999-9999-4999-8999-999999999999'
      and event_type = 'provider_cancellation.confirmed'
      and details = '{}'::jsonb
  ),
  1,
  'provider cancellation records one content-free audit event'
);

select throws_ok(
  $$insert into public.transactions (
      user_id, statement_import_id, transaction_date, normalized_merchant,
      amount_minor, currency, transaction_sha256
    ) values (
      '99999999-9999-4999-8999-999999999999',
      '33333333-aaaa-4aaa-8aaa-333333333333',
      '2026-09-02', 'OUT OF RANGE', -2147483648, 'USD', repeat('d', 64)
    )$$,
  '23514',
  null,
  'transaction amounts stay inside the safe absolute-value range'
);

select is(
  (
    select count(*)::integer from public.audit_events
    where user_id = '99999999-9999-4999-8999-999999999999'
      and event_type in ('price_history.confirmed', 'reminder.read')
      and details = '{}'::jsonb
  ),
  2,
  'price and reminder events contain no financial details'
);

set local role anon;

select throws_ok(
  $$select public.refresh_user_reminders()$$,
  '42501',
  null,
  'anonymous users cannot refresh reminders'
);

select throws_ok(
  $$select public.confirm_subscription_price_change(
    '44444444-aaaa-4aaa-8aaa-444444444444', now(), 1200
  )$$,
  '42501',
  null,
  'anonymous users cannot confirm price changes'
);

select throws_ok(
  $$select public.confirm_provider_cancellation(
    '11111111-aaaa-4aaa-8aaa-111111111111', now()
  )$$,
  '42501',
  null,
  'anonymous users cannot confirm provider cancellations'
);

select * from finish();
rollback;