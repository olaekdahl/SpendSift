create type public.import_suggestion_decision as enum (
  'pending',
  'approved',
  'merged',
  'rejected',
  'deferred'
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;

create table private.import_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  network_sha256 text not null
    constraint import_attempts_network_hash check (network_sha256 ~ '^[0-9a-f]{64}$'),
  safe_result_code text
    constraint import_attempts_result_code check (
      safe_result_code is null or safe_result_code ~ '^[A-Z0-9_]{1,64}$'
    ),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index import_attempts_user_created_idx
on private.import_attempts (user_id, created_at desc);

create index import_attempts_network_created_idx
on private.import_attempts (network_sha256, created_at desc);

create unique index statement_imports_one_active_per_user_idx
on public.statement_imports (user_id)
where status in ('mapping', 'processing', 'review');

alter table public.import_column_mappings
  add column date_format text not null default 'iso'
    constraint import_column_mappings_date_format
      check (date_format in ('iso', 'month_first')),
  add constraint import_column_mappings_date_length
    check (char_length(date_column) between 1 and 120),
  add constraint import_column_mappings_description_length
    check (char_length(description_column) between 1 and 120),
  add constraint import_column_mappings_amount_length
    check (amount_column is null or char_length(amount_column) between 1 and 120),
  add constraint import_column_mappings_debit_length
    check (debit_column is null or char_length(debit_column) between 1 and 120),
  add constraint import_column_mappings_credit_length
    check (credit_column is null or char_length(credit_column) between 1 and 120);

create table public.import_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  statement_import_id uuid not null,
  normalized_merchant text not null
    constraint import_suggestions_merchant_length
      check (char_length(normalized_merchant) between 1 and 200),
  display_name text not null
    constraint import_suggestions_display_length
      check (char_length(display_name) between 1 and 120),
  amount_minor integer not null
    constraint import_suggestions_amount_positive check (amount_minor > 0),
  currency text not null
    constraint import_suggestions_currency_format check (currency ~ '^[A-Z]{3}$'),
  billing_frequency public.billing_frequency not null,
  next_billing_date date not null,
  start_date date not null,
  confidence_score smallint not null
    constraint import_suggestions_confidence_range
      check (confidence_score between 0 and 100),
  reason_code text not null
    constraint import_suggestions_reason_code
      check (reason_code ~ '^[A-Z0-9_]{1,64}$'),
  reason_summary text not null
    constraint import_suggestions_reason_length
      check (char_length(reason_summary) between 1 and 500),
  decision public.import_suggestion_decision not null default 'pending',
  subscription_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_suggestions_owner_id_unique unique (id, user_id),
  constraint import_suggestions_import_merchant_unique
    unique (statement_import_id, normalized_merchant, currency),
  constraint import_suggestions_date_order
    check (next_billing_date >= start_date),
  constraint import_suggestions_supported_frequency
    check (billing_frequency <> 'custom'),
  constraint import_suggestions_decision_link check (
    (decision in ('approved', 'merged') and subscription_id is not null)
    or (decision in ('pending', 'rejected', 'deferred') and subscription_id is null)
  ),
  constraint import_suggestions_import_fk
    foreign key (statement_import_id, user_id)
    references public.statement_imports (id, user_id)
    on delete cascade,
  constraint import_suggestions_subscription_fk
    foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id)
    on delete set null (subscription_id)
);

create index import_suggestions_user_id_idx
on public.import_suggestions (user_id);

create index import_suggestions_import_id_idx
on public.import_suggestions (statement_import_id);

create index import_suggestions_user_decision_idx
on public.import_suggestions (user_id, decision);

alter table public.import_suggestions enable row level security;
alter table public.import_suggestions force row level security;

revoke all on table private.import_attempts from public, anon, authenticated;
revoke all on table public.import_suggestions from anon, authenticated;
grant all on table public.import_suggestions to service_role;

grant select (
  id,
  user_id,
  status,
  row_count,
  accepted_count,
  rejected_count,
  safe_error_code,
  completed_at,
  created_at,
  updated_at
) on table public.statement_imports to authenticated;

grant select (
  id,
  user_id,
  statement_import_id,
  subscription_id,
  transaction_date,
  normalized_merchant,
  amount_minor,
  currency,
  transaction_sha256
) on table public.transactions to authenticated;

grant select on table public.import_column_mappings to authenticated;
grant select on table public.merchant_aliases to authenticated;

grant select (
  id,
  user_id,
  statement_import_id,
  normalized_merchant,
  display_name,
  amount_minor,
  currency,
  billing_frequency,
  next_billing_date,
  start_date,
  confidence_score,
  reason_code,
  reason_summary,
  decision,
  subscription_id,
  updated_at
) on table public.import_suggestions to authenticated;

create policy statement_imports_select_owner
on public.statement_imports
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy transactions_select_owner
on public.transactions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy import_column_mappings_select_owner
on public.import_column_mappings
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy merchant_aliases_select_owner
on public.merchant_aliases
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy import_suggestions_select_owner
on public.import_suggestions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create trigger import_suggestions_set_updated_at
  before update on public.import_suggestions
  for each row execute function private.set_updated_at();

create or replace function public.begin_statement_import_attempt(
  network_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  attempt_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if network_sha256 is null or network_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_NETWORK_FINGERPRINT' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('import-user:' || current_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('import-network:' || network_sha256, 0));

  delete from private.import_attempts
  where created_at <= now() - interval '24 hours';

  if exists (
    select 1
    from public.statement_imports
    where user_id = current_user_id
      and status in ('mapping', 'processing', 'review')
  ) then
    raise exception 'ACTIVE_IMPORT_EXISTS' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from private.import_attempts
    where user_id = current_user_id
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'ACCOUNT_RATE_LIMIT' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from private.import_attempts
    where private.import_attempts.network_sha256 = begin_statement_import_attempt.network_sha256
      and created_at > now() - interval '1 hour'
  ) >= 25 then
    raise exception 'NETWORK_RATE_LIMIT' using errcode = 'P0001';
  end if;

  insert into private.import_attempts (user_id, network_sha256)
  values (current_user_id, begin_statement_import_attempt.network_sha256)
  returning id into attempt_id;

  return attempt_id;
end;
$$;

create or replace function public.finish_statement_import_attempt(
  attempt_id uuid,
  safe_result_code text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if safe_result_code is null or safe_result_code !~ '^[A-Z0-9_]{1,64}$' then
    raise exception 'INVALID_RESULT_CODE' using errcode = '22023';
  end if;

  update private.import_attempts
  set consumed_at = now(),
      safe_result_code = finish_statement_import_attempt.safe_result_code
  where id = attempt_id
    and user_id = current_user_id
    and consumed_at is null;

  if found then
    insert into public.audit_events (
      user_id,
      event_type,
      resource_type,
      resource_id,
      result,
      safe_reason_code
    )
    values (
      current_user_id,
      'statement_import.failed',
      'import_attempts',
      attempt_id,
      'failure',
      safe_result_code
    );
  end if;
end;
$$;

create or replace function public.create_statement_import(
  attempt_id uuid,
  file_sha256 text,
  file_size_bytes integer,
  mapping jsonb,
  transactions jsonb,
  suggestions jsonb,
  duration_bucket text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  import_id uuid;
  transaction_value jsonb;
  suggestion_value jsonb;
  transaction_count integer;
  suggestion_count integer;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if jsonb_typeof(mapping) <> 'object'
    or jsonb_typeof(transactions) <> 'array'
    or jsonb_typeof(suggestions) <> 'array'
    or pg_column_size(mapping) > 8192
    or pg_column_size(transactions) > 16777216
    or pg_column_size(suggestions) > 8388608 then
    raise exception 'INVALID_IMPORT_PAYLOAD' using errcode = '22023';
  end if;

  transaction_count := jsonb_array_length(transactions);
  suggestion_count := jsonb_array_length(suggestions);

  if transaction_count < 1 or transaction_count > 10000
    or suggestion_count > transaction_count
    or duration_bucket not in ('UNDER_100_MS', 'UNDER_500_MS', 'UNDER_2_S', 'OVER_2_S') then
    raise exception 'INVALID_IMPORT_PAYLOAD' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('import-user:' || current_user_id::text, 0));

  if not exists (
    select 1
    from private.import_attempts
    where id = attempt_id
      and user_id = current_user_id
      and consumed_at is null
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'INVALID_IMPORT_PERMIT' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.statement_imports
    where user_id = current_user_id
      and status in ('mapping', 'processing', 'review')
  ) then
    raise exception 'ACTIVE_IMPORT_EXISTS' using errcode = 'P0001';
  end if;

  update private.import_attempts
  set consumed_at = now(), safe_result_code = 'ACCEPTED'
  where id = attempt_id;

  insert into public.statement_imports (
    user_id,
    status,
    file_sha256,
    file_size_bytes,
    row_count,
    accepted_count,
    completed_at
  )
  values (
    current_user_id,
    case when suggestion_count = 0 then 'completed'::public.import_status else 'review'::public.import_status end,
    file_sha256,
    file_size_bytes,
    transaction_count,
    transaction_count,
    case when suggestion_count = 0 then now() else null end
  )
  returning id into import_id;

  insert into public.import_column_mappings (
    user_id,
    statement_import_id,
    date_column,
    description_column,
    amount_column,
    debit_column,
    credit_column,
    date_format
  )
  values (
    current_user_id,
    import_id,
    mapping ->> 'dateColumn',
    mapping ->> 'descriptionColumn',
    nullif(mapping ->> 'amountColumn', ''),
    nullif(mapping ->> 'debitColumn', ''),
    nullif(mapping ->> 'creditColumn', ''),
    mapping ->> 'dateFormat'
  );

  for transaction_value in select value from jsonb_array_elements(transactions)
  loop
    insert into public.transactions (
      user_id,
      statement_import_id,
      transaction_date,
      normalized_merchant,
      amount_minor,
      currency,
      transaction_sha256
    )
    values (
      current_user_id,
      import_id,
      (transaction_value ->> 'transactionDate')::date,
      transaction_value ->> 'normalizedMerchant',
      (transaction_value ->> 'amountMinor')::integer,
      transaction_value ->> 'currency',
      transaction_value ->> 'transactionSha256'
    );
  end loop;

  for suggestion_value in select value from jsonb_array_elements(suggestions)
  loop
    insert into public.import_suggestions (
      user_id,
      statement_import_id,
      normalized_merchant,
      display_name,
      amount_minor,
      currency,
      billing_frequency,
      next_billing_date,
      start_date,
      confidence_score,
      reason_code,
      reason_summary
    )
    values (
      current_user_id,
      import_id,
      suggestion_value ->> 'normalizedMerchant',
      suggestion_value ->> 'displayName',
      (suggestion_value ->> 'amountMinor')::integer,
      suggestion_value ->> 'currency',
      (suggestion_value ->> 'billingFrequency')::public.billing_frequency,
      (suggestion_value ->> 'nextBillingDate')::date,
      (suggestion_value ->> 'startDate')::date,
      (suggestion_value ->> 'confidenceScore')::smallint,
      suggestion_value ->> 'reasonCode',
      suggestion_value ->> 'reasonSummary'
    );
  end loop;

  insert into public.audit_events (
    user_id,
    event_type,
    resource_type,
    resource_id,
    result,
    details
  )
  values (
    current_user_id,
    'statement_import.created',
    'statement_imports',
    import_id,
    'success',
    jsonb_build_object(
      'row_count', transaction_count,
      'suggestion_count', suggestion_count,
      'duration_bucket', duration_bucket
    )
  );

  return import_id;
end;
$$;

create or replace function private.refresh_statement_import_summary(
  target_import_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  retained_count integer;
  pending_count integer;
begin
  select count(*) into retained_count
  from public.transactions
  where statement_import_id = target_import_id
    and user_id = target_user_id;

  select count(*) into pending_count
  from public.import_suggestions
  where statement_import_id = target_import_id
    and user_id = target_user_id
    and decision = 'pending';

  update public.statement_imports
  set accepted_count = retained_count,
      rejected_count = row_count - retained_count,
      status = case when pending_count = 0 then 'completed'::public.import_status else 'review'::public.import_status end,
      completed_at = case when pending_count = 0 then coalesce(completed_at, now()) else null end
  where id = target_import_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.update_import_suggestion(
  suggestion_id uuid,
  expected_updated_at timestamptz,
  display_name text,
  amount_minor integer,
  billing_frequency public.billing_frequency,
  next_billing_date date,
  start_date date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  update public.import_suggestions
  set display_name = update_import_suggestion.display_name,
      amount_minor = update_import_suggestion.amount_minor,
      billing_frequency = update_import_suggestion.billing_frequency,
      next_billing_date = update_import_suggestion.next_billing_date,
      start_date = update_import_suggestion.start_date
  where id = suggestion_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and decision in ('pending', 'deferred');

  if not found then
    raise exception 'IMPORT_CONFLICT' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id, 'import_suggestion.updated', 'import_suggestions', suggestion_id, 'success'
  );
end;
$$;

create or replace function public.approve_import_suggestion(
  suggestion_id uuid,
  expected_updated_at timestamptz,
  category text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  suggestion public.import_suggestions%rowtype;
  new_subscription_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into suggestion
  from public.import_suggestions
  where id = suggestion_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and decision in ('pending', 'deferred')
  for update;

  if not found then
    raise exception 'IMPORT_CONFLICT' using errcode = 'P0001';
  end if;

  insert into public.subscriptions (
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
    source,
    confidence_score,
    source_import_id
  )
  values (
    current_user_id,
    suggestion.normalized_merchant,
    suggestion.display_name,
    approve_import_suggestion.category,
    suggestion.amount_minor,
    suggestion.currency,
    suggestion.billing_frequency,
    suggestion.next_billing_date,
    suggestion.start_date,
    'active',
    'statement_import',
    suggestion.confidence_score,
    suggestion.statement_import_id
  )
  returning id into new_subscription_id;

  update public.transactions
  set subscription_id = new_subscription_id
  where statement_import_id = suggestion.statement_import_id
    and user_id = current_user_id
    and normalized_merchant = suggestion.normalized_merchant
    and currency = suggestion.currency;

  update public.import_suggestions
  set decision = 'approved', subscription_id = new_subscription_id
  where id = suggestion.id;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id, 'import_suggestion.approved', 'import_suggestions', suggestion.id, 'success'
  );

  perform private.refresh_statement_import_summary(suggestion.statement_import_id, current_user_id);

  return new_subscription_id;
end;
$$;

create or replace function public.merge_import_suggestion(
  suggestion_id uuid,
  expected_updated_at timestamptz,
  subscription_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  suggestion public.import_suggestions%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.subscriptions
    where id = subscription_id
      and user_id = current_user_id
      and archived_at is null
  ) then
    raise exception 'IMPORT_CONFLICT' using errcode = 'P0001';
  end if;

  select * into suggestion
  from public.import_suggestions
  where id = suggestion_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and decision in ('pending', 'deferred')
  for update;

  if not found then
    raise exception 'IMPORT_CONFLICT' using errcode = 'P0001';
  end if;

  update public.transactions
  set subscription_id = merge_import_suggestion.subscription_id
  where statement_import_id = suggestion.statement_import_id
    and user_id = current_user_id
    and normalized_merchant = suggestion.normalized_merchant
    and currency = suggestion.currency;

  update public.import_suggestions
  set decision = 'merged', subscription_id = merge_import_suggestion.subscription_id
  where id = suggestion.id;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id, 'import_suggestion.merged', 'import_suggestions', suggestion.id, 'success'
  );

  perform private.refresh_statement_import_summary(suggestion.statement_import_id, current_user_id);
end;
$$;

create or replace function public.set_import_suggestion_decision(
  suggestion_id uuid,
  expected_updated_at timestamptz,
  decision public.import_suggestion_decision
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  suggestion public.import_suggestions%rowtype;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if set_import_suggestion_decision.decision not in ('rejected', 'deferred') then
    raise exception 'INVALID_IMPORT_DECISION' using errcode = '22023';
  end if;

  select * into suggestion
  from public.import_suggestions
  where id = suggestion_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and public.import_suggestions.decision in ('pending', 'deferred')
  for update;

  if not found then
    raise exception 'IMPORT_CONFLICT' using errcode = 'P0001';
  end if;

  if set_import_suggestion_decision.decision = 'rejected' then
    delete from public.transactions
    where statement_import_id = suggestion.statement_import_id
      and user_id = current_user_id
      and normalized_merchant = suggestion.normalized_merchant
      and currency = suggestion.currency;
  end if;

  update public.import_suggestions
  set decision = set_import_suggestion_decision.decision,
      subscription_id = null
  where id = suggestion.id;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id,
    'import_suggestion.' || set_import_suggestion_decision.decision::text,
    'import_suggestions',
    suggestion.id,
    'success'
  );

  perform private.refresh_statement_import_summary(suggestion.statement_import_id, current_user_id);
end;
$$;

create or replace function public.discard_statement_import(
  statement_import_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  delete from public.statement_imports
  where id = statement_import_id
    and user_id = current_user_id
    and status in ('mapping', 'processing', 'review');

  if not found then
    raise exception 'IMPORT_CONFLICT' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    user_id,
    event_type,
    resource_type,
    resource_id,
    result
  )
  values (
    current_user_id,
    'statement_import.discarded',
    'statement_imports',
    statement_import_id,
    'success'
  );
end;
$$;

revoke all on function private.refresh_statement_import_summary(uuid, uuid) from public, anon, authenticated;
revoke all on function public.begin_statement_import_attempt(text) from public, anon;
revoke all on function public.finish_statement_import_attempt(uuid, text) from public, anon;
revoke all on function public.create_statement_import(uuid, text, integer, jsonb, jsonb, jsonb, text) from public, anon;
revoke all on function public.update_import_suggestion(uuid, timestamptz, text, integer, public.billing_frequency, date, date) from public, anon;
revoke all on function public.approve_import_suggestion(uuid, timestamptz, text) from public, anon;
revoke all on function public.merge_import_suggestion(uuid, timestamptz, uuid) from public, anon;
revoke all on function public.set_import_suggestion_decision(uuid, timestamptz, public.import_suggestion_decision) from public, anon;
revoke all on function public.discard_statement_import(uuid) from public, anon;

grant execute on function public.begin_statement_import_attempt(text) to authenticated;
grant execute on function public.finish_statement_import_attempt(uuid, text) to authenticated;
grant execute on function public.create_statement_import(uuid, text, integer, jsonb, jsonb, jsonb, text) to authenticated;
grant execute on function public.update_import_suggestion(uuid, timestamptz, text, integer, public.billing_frequency, date, date) to authenticated;
grant execute on function public.approve_import_suggestion(uuid, timestamptz, text) to authenticated;
grant execute on function public.merge_import_suggestion(uuid, timestamptz, uuid) to authenticated;
grant execute on function public.set_import_suggestion_decision(uuid, timestamptz, public.import_suggestion_decision) to authenticated;
grant execute on function public.discard_statement_import(uuid) to authenticated;