alter table public.profiles
  add column overlap_threshold smallint not null default 2
    constraint profiles_overlap_threshold_range check (overlap_threshold between 2 and 5);

alter table public.subscriptions
  add column provider_cancelled_at timestamptz,
  add column realized_monthly_minor bigint,
  add constraint subscriptions_provider_cancellation_pair check (
    (provider_cancelled_at is null and realized_monthly_minor is null)
    or (
      provider_cancelled_at is not null
      and realized_monthly_minor is not null
      and realized_monthly_minor >= 0
    )
  );

alter table public.transactions
  add constraint transactions_amount_safe_range
    check (amount_minor between -2000000000 and 2000000000);

grant select (created_at) on table public.transactions to authenticated;

alter table public.subscription_price_history
  add column source_transaction_id uuid,
  add constraint price_history_basis_points_range
    check (percentage_basis_points between -9999 and 500000),
  add constraint price_history_source_transaction_unique
    unique (subscription_id, source_transaction_id),
  add constraint price_history_source_transaction_fk
    foreign key (source_transaction_id, user_id)
    references public.transactions (id, user_id)
    on delete set null (source_transaction_id);

alter table public.reminders
  add column import_suggestion_id uuid,
  add column event_date date,
  add constraint reminders_import_suggestion_fk
    foreign key (import_suggestion_id, user_id)
    references public.import_suggestions (id, user_id)
    on delete cascade,
  add constraint reminders_source_required check (
    num_nonnulls(subscription_id, import_suggestion_id) = 1
  ),
  add constraint reminders_type_source check (
    (reminder_type = 'review_later' and import_suggestion_id is not null)
    or (reminder_type <> 'review_later' and subscription_id is not null)
  ),
  add constraint reminders_event_date_required check (
    (reminder_type = 'review_later' and event_date is null)
    or (reminder_type <> 'review_later' and event_date is not null)
  );

create unique index reminders_event_unique_idx
on public.reminders (user_id, subscription_id, reminder_type, event_date)
where subscription_id is not null;

create unique index reminders_review_unique_idx
on public.reminders (user_id, import_suggestion_id, reminder_type)
where import_suggestion_id is not null;

grant select (
  id,
  user_id,
  subscription_id,
  previous_amount_minor,
  new_amount_minor,
  percentage_basis_points,
  detected_at,
  confirmed_at,
  source_transaction_id,
  created_at
) on table public.subscription_price_history to authenticated;

grant select (
  id,
  user_id,
  subscription_id,
  import_suggestion_id,
  event_date,
  reminder_type,
  status,
  due_at,
  read_at,
  updated_at
) on table public.reminders to authenticated;

create policy price_history_select_owner
on public.subscription_price_history
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy reminders_select_owner
on public.reminders
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create or replace function private.clear_reactivated_cancellation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'cancelled' then
    new.provider_cancelled_at = null;
    new.realized_monthly_minor = null;
  end if;

  return new;
end;
$$;

create trigger subscriptions_clear_reactivated_cancellation
  before update of status on public.subscriptions
  for each row execute function private.clear_reactivated_cancellation();

create or replace function private.sync_subscription_reminders()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  renewal_enabled boolean;
  trial_enabled boolean;
  profile_time_zone text;
begin
  delete from public.reminders
  where subscription_id = new.id
    and user_id = new.user_id
    and status = 'pending'
    and reminder_type in ('renewal', 'trial_ending', 'annual_renewal');

  if new.archived_at is not null or new.status not in ('active', 'trial') then
    delete from public.reminders
    where subscription_id = new.id
      and user_id = new.user_id
      and reminder_type = 'price_increase'
      and status = 'pending';
    return new;
  end if;

  select
    renewal_reminders_enabled,
    trial_reminders_enabled,
    time_zone
  into renewal_enabled, trial_enabled, profile_time_zone
  from public.profiles
  where user_id = new.user_id;

  if not found then
    return new;
  end if;

  if renewal_enabled then
    insert into public.reminders (
      user_id,
      subscription_id,
      reminder_type,
      event_date,
      due_at
    )
    values (
      new.user_id,
      new.id,
      case
        when new.billing_frequency = 'annual' then 'annual_renewal'::public.reminder_type
        else 'renewal'::public.reminder_type
      end,
      new.next_billing_date,
      ((new.next_billing_date - new.reminder_lead_days) + time '09:00') at time zone profile_time_zone
    )
    on conflict (user_id, subscription_id, reminder_type, event_date)
      where subscription_id is not null
      do nothing;
  end if;

  if trial_enabled and new.status = 'trial' and new.trial_end_date is not null then
    insert into public.reminders (
      user_id,
      subscription_id,
      reminder_type,
      event_date,
      due_at
    )
    values (
      new.user_id,
      new.id,
      'trial_ending',
      new.trial_end_date,
      ((new.trial_end_date - new.reminder_lead_days) + time '09:00') at time zone profile_time_zone
    )
    on conflict (user_id, subscription_id, reminder_type, event_date)
      where subscription_id is not null
      do nothing;
  end if;

  return new;
end;
$$;

create or replace function private.sync_transaction_price_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_subscription_id uuid := new.subscription_id;
  target_user_id uuid := new.user_id;
  current_amount integer;
  latest_amount integer;
  basis_points numeric;
begin
  if target_subscription_id is null then
    return new;
  end if;

  delete from public.reminders
  where user_id = target_user_id
    and subscription_id = target_subscription_id
    and reminder_type = 'price_increase'
    and status = 'pending';

  select amount_minor into current_amount
  from public.subscriptions
  where id = target_subscription_id
    and user_id = target_user_id
    and archived_at is null;

  select abs(amount_minor::bigint)::integer into latest_amount
  from public.transactions
  where subscription_id = target_subscription_id
    and user_id = target_user_id
    and amount_minor < 0
  order by transaction_date desc, created_at desc, id desc
  limit 1;

  if current_amount is null or latest_amount is null then
    return new;
  end if;

  basis_points := round(
    ((latest_amount - current_amount)::numeric * 10000) / current_amount
  );

  if latest_amount - current_amount >= 50
    and basis_points between 200 and 500000 then
    insert into public.reminders (
      user_id, subscription_id, reminder_type, event_date, due_at
    ) values (
      target_user_id, target_subscription_id, 'price_increase', new.transaction_date, clock_timestamp()
    )
    on conflict (user_id, subscription_id, reminder_type, event_date)
      where subscription_id is not null
      do nothing;
  end if;

  return new;
end;
$$;

create or replace function private.sync_deferred_review_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reminders
  where user_id = new.user_id
    and import_suggestion_id = new.id
    and reminder_type = 'review_later'
    and status = 'pending';

  if new.decision = 'deferred' then
    insert into public.reminders (
      user_id, import_suggestion_id, reminder_type, due_at
    ) values (
      new.user_id, new.id, 'review_later', clock_timestamp() + interval '7 days'
    )
    on conflict (user_id, import_suggestion_id, reminder_type)
      where import_suggestion_id is not null
      do nothing;
  end if;

  return new;
end;
$$;

create trigger subscriptions_sync_reminders
  after insert or update of
    next_billing_date,
    trial_end_date,
    reminder_lead_days,
    billing_frequency,
    status,
    archived_at
  on public.subscriptions
  for each row execute function private.sync_subscription_reminders();

create trigger transactions_sync_price_reminder
  after insert or update of subscription_id, amount_minor, transaction_date
  on public.transactions
  for each row execute function private.sync_transaction_price_reminder();

create trigger import_suggestions_sync_deferred_reminder
  after update of decision on public.import_suggestions
  for each row execute function private.sync_deferred_review_reminder();

insert into public.reminders (
  user_id,
  subscription_id,
  reminder_type,
  event_date,
  due_at
)
select
  subscriptions.user_id,
  subscriptions.id,
  case
    when subscriptions.billing_frequency = 'annual' then 'annual_renewal'::public.reminder_type
    else 'renewal'::public.reminder_type
  end,
  subscriptions.next_billing_date,
  ((subscriptions.next_billing_date - subscriptions.reminder_lead_days) + time '09:00') at time zone profiles.time_zone
from public.subscriptions
join public.profiles on profiles.user_id = subscriptions.user_id
where subscriptions.archived_at is null
  and subscriptions.status in ('active', 'trial')
  and profiles.renewal_reminders_enabled
on conflict (user_id, subscription_id, reminder_type, event_date)
  where subscription_id is not null
  do nothing;

insert into public.reminders (
  user_id,
  subscription_id,
  reminder_type,
  event_date,
  due_at
)
select
  subscriptions.user_id,
  subscriptions.id,
  'trial_ending',
  subscriptions.trial_end_date,
  ((subscriptions.trial_end_date - subscriptions.reminder_lead_days) + time '09:00') at time zone profiles.time_zone
from public.subscriptions
join public.profiles on profiles.user_id = subscriptions.user_id
where subscriptions.archived_at is null
  and subscriptions.status = 'trial'
  and subscriptions.trial_end_date is not null
  and profiles.trial_reminders_enabled
on conflict (user_id, subscription_id, reminder_type, event_date)
  where subscription_id is not null
  do nothing;

create or replace function public.refresh_user_reminders()
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

  delete from public.reminders
  where user_id = current_user_id
    and status = 'pending'
    and reminder_type in ('renewal', 'trial_ending', 'annual_renewal');

  insert into public.reminders (
    user_id,
    subscription_id,
    reminder_type,
    event_date,
    due_at
  )
  select
    subscriptions.user_id,
    subscriptions.id,
    case
      when subscriptions.billing_frequency = 'annual' then 'annual_renewal'::public.reminder_type
      else 'renewal'::public.reminder_type
    end,
    subscriptions.next_billing_date,
    ((subscriptions.next_billing_date - subscriptions.reminder_lead_days) + time '09:00') at time zone profiles.time_zone
  from public.subscriptions
  join public.profiles on profiles.user_id = subscriptions.user_id
  where subscriptions.user_id = current_user_id
    and subscriptions.archived_at is null
    and subscriptions.status in ('active', 'trial')
    and profiles.renewal_reminders_enabled
  on conflict (user_id, subscription_id, reminder_type, event_date)
    where subscription_id is not null
    do nothing;

  insert into public.reminders (
    user_id,
    subscription_id,
    reminder_type,
    event_date,
    due_at
  )
  select
    subscriptions.user_id,
    subscriptions.id,
    'trial_ending',
    subscriptions.trial_end_date,
    ((subscriptions.trial_end_date - subscriptions.reminder_lead_days) + time '09:00') at time zone profiles.time_zone
  from public.subscriptions
  join public.profiles on profiles.user_id = subscriptions.user_id
  where subscriptions.user_id = current_user_id
    and subscriptions.archived_at is null
    and subscriptions.status = 'trial'
    and subscriptions.trial_end_date is not null
    and profiles.trial_reminders_enabled
  on conflict (user_id, subscription_id, reminder_type, event_date)
    where subscription_id is not null
    do nothing;
end;
$$;

create or replace function public.save_profile_preferences(
  preferred_currency text,
  locale text,
  time_zone text,
  renewal_reminders_enabled boolean,
  trial_reminders_enabled boolean,
  overlap_threshold smallint,
  monthly_budget_minor integer default null,
  monthly_savings_goal_minor integer default null
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

  if overlap_threshold < 2 or overlap_threshold > 5 then
    raise exception 'INVALID_OVERLAP_THRESHOLD' using errcode = '22023';
  end if;

  if preferred_currency <> 'USD'
    or locale !~ '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$'
    or not exists (
      select 1 from pg_catalog.pg_timezone_names
      where name = save_profile_preferences.time_zone
    )
    or monthly_budget_minor is not null
      and (monthly_budget_minor < 0 or monthly_budget_minor > 100000000)
    or monthly_savings_goal_minor is not null
      and (monthly_savings_goal_minor < 0 or monthly_savings_goal_minor > 100000000) then
    raise exception 'INVALID_PROFILE_PREFERENCES' using errcode = '22023';
  end if;

  update public.profiles
  set
    preferred_currency = save_profile_preferences.preferred_currency,
    locale = save_profile_preferences.locale,
    time_zone = save_profile_preferences.time_zone,
    renewal_reminders_enabled = save_profile_preferences.renewal_reminders_enabled,
    trial_reminders_enabled = save_profile_preferences.trial_reminders_enabled,
    overlap_threshold = save_profile_preferences.overlap_threshold,
    onboarding_completed_at = coalesce(onboarding_completed_at, now())
  where user_id = current_user_id;

  if not found then
    raise exception 'PROFILE_NOT_FOUND' using errcode = 'P0002';
  end if;

  delete from public.budgets
  where user_id = current_user_id
    and (
      monthly_budget_minor is null
      or currency <> save_profile_preferences.preferred_currency
    );

  if monthly_budget_minor is not null then
    insert into public.budgets (user_id, monthly_limit_minor, currency)
    values (
      current_user_id,
      save_profile_preferences.monthly_budget_minor,
      save_profile_preferences.preferred_currency
    )
    on conflict (user_id, currency)
    do update set monthly_limit_minor = excluded.monthly_limit_minor;
  end if;

  delete from public.savings_goals
  where user_id = current_user_id
    and (
      monthly_savings_goal_minor is null
      or currency <> save_profile_preferences.preferred_currency
    );

  if monthly_savings_goal_minor is not null then
    insert into public.savings_goals (user_id, monthly_target_minor, currency)
    values (
      current_user_id,
      save_profile_preferences.monthly_savings_goal_minor,
      save_profile_preferences.preferred_currency
    )
    on conflict (user_id, currency)
    do update set monthly_target_minor = excluded.monthly_target_minor;
  end if;

  perform public.refresh_user_reminders();
end;
$$;

create or replace function public.confirm_subscription_price_change(
  subscription_id uuid,
  expected_updated_at timestamptz,
  expected_new_amount_minor integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  subscription public.subscriptions%rowtype;
  source_transaction public.transactions%rowtype;
  new_amount_minor integer;
  basis_points numeric;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into subscription
  from public.subscriptions
  where id = subscription_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and archived_at is null
  for update;

  if not found then
    raise exception 'INSIGHT_CONFLICT' using errcode = 'P0001';
  end if;

  select * into source_transaction
  from public.transactions
  where public.transactions.subscription_id = subscription.id
    and user_id = current_user_id
    and currency = subscription.currency
    and amount_minor < 0
  order by transaction_date desc, created_at desc, id desc
  limit 1;

  if not found then
    raise exception 'PRICE_CHANGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  new_amount_minor := abs(source_transaction.amount_minor::bigint)::integer;
  basis_points := round(
    ((new_amount_minor - subscription.amount_minor)::numeric * 10000)
      / subscription.amount_minor
  );

  if new_amount_minor <> expected_new_amount_minor
    or abs(new_amount_minor - subscription.amount_minor) < 50
    or abs(basis_points) < 200
    or basis_points > 500000 then
    raise exception 'PRICE_CHANGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.subscription_price_history (
    user_id,
    subscription_id,
    previous_amount_minor,
    new_amount_minor,
    percentage_basis_points,
    detected_at,
    confirmed_at,
    source_transaction_id
  )
  values (
    current_user_id,
    subscription.id,
    subscription.amount_minor,
    new_amount_minor,
    basis_points::integer,
    now(),
    now(),
    source_transaction.id
  );

  update public.subscriptions
  set amount_minor = new_amount_minor
  where id = subscription.id
    and user_id = current_user_id;

  delete from public.reminders
  where user_id = current_user_id
    and public.reminders.subscription_id = subscription.id
    and reminder_type = 'price_increase'
    and status = 'pending';

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id,
    'price_history.confirmed',
    'subscription_price_history',
    subscription.id,
    'success'
  );
end;
$$;

create or replace function public.set_reminder_status(
  reminder_id uuid,
  expected_updated_at timestamptz,
  reminder_status public.reminder_status
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

  if reminder_status not in ('read', 'dismissed') then
    raise exception 'INVALID_REMINDER_STATUS' using errcode = '22023';
  end if;

  update public.reminders
  set status = set_reminder_status.reminder_status,
      read_at = case
        when set_reminder_status.reminder_status = 'read' then now()
        else null
      end
  where id = reminder_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and status = 'pending';

  if not found then
    raise exception 'INSIGHT_CONFLICT' using errcode = 'P0001';
  end if;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id,
    'reminder.' || set_reminder_status.reminder_status::text,
    'reminders',
    reminder_id,
    'success'
  );
end;
$$;

create or replace function public.confirm_provider_cancellation(
  subscription_id uuid,
  expected_updated_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  subscription public.subscriptions%rowtype;
  monthly_minor bigint;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into subscription
  from public.subscriptions
  where id = subscription_id
    and user_id = current_user_id
    and updated_at = expected_updated_at
    and archived_at is null
    and provider_cancelled_at is null
    and status in ('active', 'trial', 'paused')
  for update;

  if not found then
    raise exception 'INSIGHT_CONFLICT' using errcode = 'P0001';
  end if;

  monthly_minor := case subscription.billing_frequency
    when 'weekly' then round((subscription.amount_minor::numeric * 52) / 12)
    when 'monthly' then subscription.amount_minor
    when 'every_two_months' then round((subscription.amount_minor::numeric * 6) / 12)
    when 'quarterly' then round((subscription.amount_minor::numeric * 4) / 12)
    when 'every_six_months' then round((subscription.amount_minor::numeric * 2) / 12)
    when 'annual' then round(subscription.amount_minor::numeric / 12)
    when 'custom' then round(
      (subscription.amount_minor::numeric * 365)
        / (subscription.custom_interval_days * 12)
    )
  end;

  update public.subscriptions
  set status = 'cancelled',
      provider_cancelled_at = clock_timestamp(),
      realized_monthly_minor = monthly_minor
  where id = subscription.id
    and user_id = current_user_id;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id,
    'provider_cancellation.confirmed',
    'subscriptions',
    subscription.id,
    'success'
  );
end;
$$;

revoke all on function private.sync_subscription_reminders() from public, anon, authenticated;
revoke all on function private.sync_transaction_price_reminder() from public, anon, authenticated;
revoke all on function private.sync_deferred_review_reminder() from public, anon, authenticated;
revoke all on function private.clear_reactivated_cancellation() from public, anon, authenticated;
revoke all on function public.refresh_user_reminders() from public, anon, authenticated;
revoke all on function public.save_profile_preferences(text, text, text, boolean, boolean, smallint, integer, integer) from public, anon;
revoke all on function public.confirm_subscription_price_change(uuid, timestamptz, integer) from public, anon;
revoke all on function public.set_reminder_status(uuid, timestamptz, public.reminder_status) from public, anon;
revoke all on function public.confirm_provider_cancellation(uuid, timestamptz) from public, anon;

grant execute on function public.save_profile_preferences(text, text, text, boolean, boolean, smallint, integer, integer) to authenticated;
grant execute on function public.confirm_subscription_price_change(uuid, timestamptz, integer) to authenticated;
grant execute on function public.set_reminder_status(uuid, timestamptz, public.reminder_status) to authenticated;
grant execute on function public.confirm_provider_cancellation(uuid, timestamptz) to authenticated;