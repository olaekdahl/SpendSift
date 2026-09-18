create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgtap with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.billing_frequency as enum (
  'weekly',
  'monthly',
  'every_two_months',
  'quarterly',
  'every_six_months',
  'annual',
  'custom'
);

create type public.subscription_status as enum (
  'trial',
  'active',
  'paused',
  'cancelled',
  'expired',
  'needs_review'
);

create type public.subscription_source as enum (
  'manual',
  'statement_import'
);

create type public.import_status as enum (
  'mapping',
  'processing',
  'review',
  'completed',
  'failed'
);

create type public.reminder_type as enum (
  'renewal',
  'trial_ending',
  'annual_renewal',
  'price_increase',
  'review_later'
);

create type public.reminder_status as enum (
  'pending',
  'read',
  'dismissed'
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  preferred_currency text not null default 'USD'
    constraint profiles_currency_format check (preferred_currency ~ '^[A-Z]{3}$'),
  locale text not null default 'en-US'
    constraint profiles_locale_length check (char_length(locale) between 2 and 35),
  time_zone text not null default 'UTC'
    constraint profiles_time_zone_length check (char_length(time_zone) between 1 and 100),
  renewal_reminders_enabled boolean not null default true,
  trial_reminders_enabled boolean not null default true,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.statement_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status public.import_status not null default 'mapping',
  file_sha256 text not null
    constraint statement_imports_hash_format check (file_sha256 ~ '^[0-9a-f]{64}$'),
  file_size_bytes integer not null
    constraint statement_imports_file_size check (file_size_bytes between 1 and 5242880),
  row_count integer not null default 0
    constraint statement_imports_row_count check (row_count between 0 and 10000),
  accepted_count integer not null default 0
    constraint statement_imports_accepted_count check (accepted_count between 0 and row_count),
  rejected_count integer not null default 0
    constraint statement_imports_rejected_count check (rejected_count between 0 and row_count),
  safe_error_code text
    constraint statement_imports_error_code check (
      safe_error_code is null or safe_error_code ~ '^[A-Z0-9_]{1,64}$'
    ),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint statement_imports_owner_id_unique unique (id, user_id),
  constraint statement_imports_user_hash_unique unique (user_id, file_sha256),
  constraint statement_imports_summary_count check (
    accepted_count + rejected_count <= row_count
  )
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merchant_name text not null
    constraint subscriptions_merchant_name_length check (char_length(merchant_name) between 1 and 200),
  display_name text not null
    constraint subscriptions_display_name_length check (char_length(display_name) between 1 and 120),
  category text not null
    constraint subscriptions_category_allowed check (
      category in (
        'Video streaming',
        'Music',
        'Cloud storage',
        'News and publications',
        'Software',
        'Gaming',
        'Fitness',
        'Food delivery memberships',
        'Shopping memberships',
        'Security and privacy',
        'Other'
      )
    ),
  amount_minor integer not null
    constraint subscriptions_amount_positive check (amount_minor > 0),
  currency text not null default 'USD'
    constraint subscriptions_currency_format check (currency ~ '^[A-Z]{3}$'),
  billing_frequency public.billing_frequency not null,
  custom_interval_days integer
    constraint subscriptions_custom_interval_range check (
      custom_interval_days is null or custom_interval_days between 1 and 3660
    ),
  next_billing_date date not null,
  start_date date not null,
  trial_end_date date,
  status public.subscription_status not null default 'active',
  payment_method_nickname text
    constraint subscriptions_payment_nickname_length check (
      payment_method_nickname is null or char_length(payment_method_nickname) between 1 and 80
    ),
  website text
    constraint subscriptions_website_https check (
      website is null or website ~ '^https://'
    ),
  cancellation_url text
    constraint subscriptions_cancellation_url_https check (
      cancellation_url is null or cancellation_url ~ '^https://'
    ),
  cancellation_instructions text
    constraint subscriptions_cancellation_instructions_length check (
      cancellation_instructions is null or char_length(cancellation_instructions) <= 4000
    ),
  notes text
    constraint subscriptions_notes_length check (notes is null or char_length(notes) <= 4000),
  reminder_lead_days integer not null default 7
    constraint subscriptions_reminder_lead_range check (reminder_lead_days between 0 and 365),
  source public.subscription_source not null default 'manual',
  confidence_score smallint
    constraint subscriptions_confidence_range check (
      confidence_score is null or confidence_score between 0 and 100
    ),
  source_import_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_owner_id_unique unique (id, user_id),
  constraint subscriptions_custom_interval_required check (
    (billing_frequency = 'custom' and custom_interval_days is not null)
    or (billing_frequency <> 'custom' and custom_interval_days is null)
  ),
  constraint subscriptions_date_order check (
    trial_end_date is null or trial_end_date >= start_date
  ),
  constraint subscriptions_source_import_fk
    foreign key (source_import_id, user_id)
    references public.statement_imports (id, user_id)
    on delete set null (source_import_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  statement_import_id uuid not null,
  subscription_id uuid,
  transaction_date date not null,
  normalized_merchant text not null
    constraint transactions_merchant_length check (char_length(normalized_merchant) between 1 and 200),
  amount_minor integer not null
    constraint transactions_amount_nonzero check (amount_minor <> 0),
  currency text not null default 'USD'
    constraint transactions_currency_format check (currency ~ '^[A-Z]{3}$'),
  transaction_sha256 text not null
    constraint transactions_hash_format check (transaction_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_owner_id_unique unique (id, user_id),
  constraint transactions_user_hash_unique unique (user_id, transaction_sha256),
  constraint transactions_import_fk
    foreign key (statement_import_id, user_id)
    references public.statement_imports (id, user_id)
    on delete cascade,
  constraint transactions_subscription_fk
    foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id)
    on delete set null (subscription_id)
);

create table public.import_column_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  statement_import_id uuid not null,
  date_column text not null,
  description_column text not null,
  amount_column text,
  debit_column text,
  credit_column text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_column_mappings_import_unique unique (statement_import_id),
  constraint import_column_mappings_amount_columns check (
    amount_column is not null or debit_column is not null or credit_column is not null
  ),
  constraint import_column_mappings_import_fk
    foreign key (statement_import_id, user_id)
    references public.statement_imports (id, user_id)
    on delete cascade
);

create table public.merchant_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  alias text not null
    constraint merchant_aliases_alias_length check (char_length(alias) between 1 and 200),
  normalized_merchant text not null
    constraint merchant_aliases_normalized_length check (char_length(normalized_merchant) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_aliases_user_alias_unique unique (user_id, alias)
);

create table public.subscription_price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid not null,
  previous_amount_minor integer not null
    constraint price_history_previous_positive check (previous_amount_minor > 0),
  new_amount_minor integer not null
    constraint price_history_new_positive check (new_amount_minor > 0),
  percentage_basis_points integer not null,
  detected_at timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_history_amount_changed check (new_amount_minor <> previous_amount_minor),
  constraint price_history_subscription_fk
    foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id)
    on delete cascade
);

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid,
  reminder_type public.reminder_type not null,
  status public.reminder_status not null default 'pending',
  due_at timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminders_subscription_fk
    foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id)
    on delete cascade
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monthly_limit_minor integer not null
    constraint budgets_limit_nonnegative check (monthly_limit_minor >= 0),
  currency text not null default 'USD'
    constraint budgets_currency_format check (currency ~ '^[A-Z]{3}$'),
  effective_from date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budgets_user_currency_unique unique (user_id, currency)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monthly_target_minor integer not null
    constraint savings_goals_target_nonnegative check (monthly_target_minor >= 0),
  realized_monthly_minor integer not null default 0
    constraint savings_goals_realized_nonnegative check (realized_monthly_minor >= 0),
  currency text not null default 'USD'
    constraint savings_goals_currency_format check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint savings_goals_user_currency_unique unique (user_id, currency)
);

create table public.cancellation_guides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid not null,
  cancellation_url text
    constraint cancellation_guides_url_https check (
      cancellation_url is null or cancellation_url ~ '^https://'
    ),
  phone_number text
    constraint cancellation_guides_phone_length check (
      phone_number is null or char_length(phone_number) between 3 and 40
    ),
  instructions text
    constraint cancellation_guides_instructions_length check (
      instructions is null or char_length(instructions) <= 4000
    ),
  verified_at timestamptz,
  user_notes text
    constraint cancellation_guides_notes_length check (
      user_notes is null or char_length(user_notes) <= 4000
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cancellation_guides_subscription_unique unique (subscription_id),
  constraint cancellation_guides_subscription_fk
    foreign key (subscription_id, user_id)
    references public.subscriptions (id, user_id)
    on delete cascade
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null
    constraint audit_events_event_type_format check (event_type ~ '^[a-z][a-z0-9_.]{2,80}$'),
  resource_type text not null
    constraint audit_events_resource_type_format check (resource_type ~ '^[a-z][a-z0-9_]{1,62}$'),
  resource_id uuid,
  result text not null default 'success'
    constraint audit_events_result_allowed check (result in ('success', 'denied', 'failure')),
  safe_reason_code text
    constraint audit_events_reason_format check (
      safe_reason_code is null or safe_reason_code ~ '^[A-Z0-9_]{1,64}$'
    ),
  details jsonb not null default '{}'::jsonb
    constraint audit_events_details_object check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function private.audit_owned_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  object_id uuid;
begin
  if tg_op = 'DELETE' then
    owner_id := old.user_id;
    object_id := old.id;
  else
    owner_id := new.user_id;
    object_id := new.id;
  end if;

  if not exists (
    select 1
    from auth.users
    where auth.users.id = owner_id
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  insert into public.audit_events (
    user_id,
    event_type,
    resource_type,
    resource_id,
    result
  )
  values (
    owner_id,
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    object_id,
    'success'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.complete_onboarding(
  preferred_currency text,
  locale text,
  time_zone text,
  renewal_reminders_enabled boolean,
  trial_reminders_enabled boolean,
  monthly_budget_minor integer default null,
  monthly_savings_goal_minor integer default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.profiles
  set
    preferred_currency = complete_onboarding.preferred_currency,
    locale = complete_onboarding.locale,
    time_zone = complete_onboarding.time_zone,
    renewal_reminders_enabled = complete_onboarding.renewal_reminders_enabled,
    trial_reminders_enabled = complete_onboarding.trial_reminders_enabled,
    onboarding_completed_at = now()
  where user_id = current_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  delete from public.budgets
  where user_id = current_user_id
    and (
      monthly_budget_minor is null
      or currency <> complete_onboarding.preferred_currency
    );

  if monthly_budget_minor is not null then
    insert into public.budgets (user_id, monthly_limit_minor, currency)
    values (
      current_user_id,
      complete_onboarding.monthly_budget_minor,
      complete_onboarding.preferred_currency
    )
    on conflict (user_id, currency)
    do update set monthly_limit_minor = excluded.monthly_limit_minor;
  end if;

  delete from public.savings_goals
  where user_id = current_user_id
    and (
      monthly_savings_goal_minor is null
      or currency <> complete_onboarding.preferred_currency
    );

  if monthly_savings_goal_minor is not null then
    insert into public.savings_goals (user_id, monthly_target_minor, currency)
    values (
      current_user_id,
      complete_onboarding.monthly_savings_goal_minor,
      complete_onboarding.preferred_currency
    )
    on conflict (user_id, currency)
    do update set monthly_target_minor = excluded.monthly_target_minor;
  end if;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function private.audit_owned_row_change() from public, anon, authenticated;
revoke all on function public.complete_onboarding(text, text, text, boolean, boolean, integer, integer) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, boolean, boolean, integer, integer) to authenticated;

create trigger auth_user_created
  after insert on auth.users
  for each row execute function private.create_profile_for_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function private.set_updated_at();

create trigger statement_imports_set_updated_at
  before update on public.statement_imports
  for each row execute function private.set_updated_at();

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function private.set_updated_at();

create trigger import_column_mappings_set_updated_at
  before update on public.import_column_mappings
  for each row execute function private.set_updated_at();

create trigger merchant_aliases_set_updated_at
  before update on public.merchant_aliases
  for each row execute function private.set_updated_at();

create trigger price_history_set_updated_at
  before update on public.subscription_price_history
  for each row execute function private.set_updated_at();

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function private.set_updated_at();

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function private.set_updated_at();

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function private.set_updated_at();

create trigger cancellation_guides_set_updated_at
  before update on public.cancellation_guides
  for each row execute function private.set_updated_at();

create trigger profiles_audit_changes
  after insert or update or delete on public.profiles
  for each row execute function private.audit_owned_row_change();

create trigger subscriptions_audit_changes
  after insert or update or delete on public.subscriptions
  for each row execute function private.audit_owned_row_change();

create trigger budgets_audit_changes
  after insert or update or delete on public.budgets
  for each row execute function private.audit_owned_row_change();

create trigger savings_goals_audit_changes
  after insert or update or delete on public.savings_goals
  for each row execute function private.audit_owned_row_change();

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_user_status_idx on public.subscriptions (user_id, status);
create index subscriptions_user_next_billing_idx on public.subscriptions (user_id, next_billing_date);
create index statement_imports_user_id_idx on public.statement_imports (user_id);
create index transactions_user_id_idx on public.transactions (user_id);
create index transactions_import_id_idx on public.transactions (statement_import_id);
create index transactions_subscription_id_idx on public.transactions (subscription_id);
create index import_column_mappings_user_id_idx on public.import_column_mappings (user_id);
create index merchant_aliases_user_id_idx on public.merchant_aliases (user_id);
create index price_history_user_id_idx on public.subscription_price_history (user_id);
create index price_history_subscription_id_idx on public.subscription_price_history (subscription_id);
create index reminders_user_id_idx on public.reminders (user_id);
create index reminders_user_due_idx on public.reminders (user_id, due_at);
create index budgets_user_id_idx on public.budgets (user_id);
create index savings_goals_user_id_idx on public.savings_goals (user_id);
create index cancellation_guides_user_id_idx on public.cancellation_guides (user_id);
create index audit_events_user_created_idx on public.audit_events (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.transactions enable row level security;
alter table public.statement_imports enable row level security;
alter table public.import_column_mappings enable row level security;
alter table public.merchant_aliases enable row level security;
alter table public.subscription_price_history enable row level security;
alter table public.reminders enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.cancellation_guides enable row level security;
alter table public.audit_events enable row level security;

alter table public.profiles force row level security;
alter table public.subscriptions force row level security;
alter table public.transactions force row level security;
alter table public.statement_imports force row level security;
alter table public.import_column_mappings force row level security;
alter table public.merchant_aliases force row level security;
alter table public.subscription_price_history force row level security;
alter table public.reminders force row level security;
alter table public.budgets force row level security;
alter table public.savings_goals force row level security;
alter table public.cancellation_guides force row level security;
alter table public.audit_events force row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.transactions from anon, authenticated;
revoke all on table public.statement_imports from anon, authenticated;
revoke all on table public.import_column_mappings from anon, authenticated;
revoke all on table public.merchant_aliases from anon, authenticated;
revoke all on table public.subscription_price_history from anon, authenticated;
revoke all on table public.reminders from anon, authenticated;
revoke all on table public.budgets from anon, authenticated;
revoke all on table public.savings_goals from anon, authenticated;
revoke all on table public.cancellation_guides from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on sequence public.audit_events_id_seq from anon, authenticated;

grant all on table
  public.profiles,
  public.subscriptions,
  public.transactions,
  public.statement_imports,
  public.import_column_mappings,
  public.merchant_aliases,
  public.subscription_price_history,
  public.reminders,
  public.budgets,
  public.savings_goals,
  public.cancellation_guides,
  public.audit_events
to service_role;
grant usage, select on sequence public.audit_events_id_seq to service_role;

grant select on table public.profiles to authenticated;
grant update (
  preferred_currency,
  locale,
  time_zone,
  renewal_reminders_enabled,
  trial_reminders_enabled,
  onboarding_completed_at
) on table public.profiles to authenticated;
grant select on table public.subscriptions to authenticated;
grant select, delete on table public.budgets to authenticated;
grant insert (user_id, monthly_limit_minor, currency, effective_from)
on table public.budgets to authenticated;
grant update (monthly_limit_minor, currency, effective_from)
on table public.budgets to authenticated;
grant select, delete on table public.savings_goals to authenticated;
grant insert (user_id, monthly_target_minor, currency)
on table public.savings_goals to authenticated;
grant update (monthly_target_minor, currency)
on table public.savings_goals to authenticated;

create policy profiles_select_owner
on public.profiles
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy profiles_update_owner
on public.profiles
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy subscriptions_select_owner
on public.subscriptions
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy budgets_select_owner
on public.budgets
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy budgets_insert_owner
on public.budgets
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy budgets_update_owner
on public.budgets
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy budgets_delete_owner
on public.budgets
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy savings_goals_select_owner
on public.savings_goals
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy savings_goals_insert_owner
on public.savings_goals
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy savings_goals_update_owner
on public.savings_goals
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy savings_goals_delete_owner
on public.savings_goals
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
