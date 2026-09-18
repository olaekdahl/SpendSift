alter table public.cancellation_guides
  alter column verified_at type date using verified_at::date,
  drop constraint cancellation_guides_url_https;

alter table public.cancellation_guides
  add constraint cancellation_guides_url_https check (
    cancellation_url is null
    or (
      char_length(cancellation_url) <= 2048
      and
      cancellation_url ~ '^https://[^/@[:space:]]+([/?#].*)?$'
      and cancellation_url !~ '[[:cntrl:]]'
      and cancellation_url !~* '%(0[0-9a-f]|1[0-9a-f]|7f)'
    )
  ),
  add constraint cancellation_guides_phone_format check (
    phone_number is null
    or phone_number ~ '^[+0-9() .-]{3,40}$'
  ),
  add constraint cancellation_guides_verified_date check (
    verified_at is null
    or verified_at between date '2000-01-01' and current_date
  ),
  add constraint cancellation_guides_instructions_controls check (
    instructions is null
    or translate(instructions, E'\n\r\t', '') !~ '[[:cntrl:]]'
  ),
  add constraint cancellation_guides_notes_controls check (
    user_notes is null
    or translate(user_notes, E'\n\r\t', '') !~ '[[:cntrl:]]'
  ),
  add constraint cancellation_guides_content_required check (
    num_nonnulls(
      cancellation_url,
      phone_number,
      instructions,
      verified_at,
      user_notes
    ) > 0
  );

alter table public.cancellation_guides
  add constraint cancellation_guides_owner_id_unique unique (id, user_id);

grant select (
  id,
  user_id,
  subscription_id,
  cancellation_url,
  phone_number,
  instructions,
  verified_at,
  user_notes,
  updated_at
) on table public.cancellation_guides to authenticated;

create policy cancellation_guides_select_owner
on public.cancellation_guides
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create trigger cancellation_guides_audit_changes
  after insert or update or delete on public.cancellation_guides
  for each row execute function private.audit_owned_row_change();

create table private.account_action_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action_name text not null
    constraint account_action_name_allowed check (action_name in ('export', 'delete')),
  auth_session_id text not null
    constraint account_action_session_length check (char_length(auth_session_id) between 1 and 128),
  network_sha256 text not null
    constraint account_action_network_hash check (network_sha256 ~ '^[0-9a-f]{64}$'),
  safe_result_code text
    constraint account_action_result_code check (
      safe_result_code is null or safe_result_code ~ '^[A-Z0-9_]{1,64}$'
    ),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index account_action_attempts_user_created_idx
on private.account_action_attempts (user_id, action_name, created_at desc);

create index account_action_attempts_network_created_idx
on private.account_action_attempts (network_sha256, action_name, created_at desc);

create table private.account_deletion_receipts (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'account.deleted'
    constraint account_deletion_receipt_event check (event_type = 'account.deleted'),
  created_at timestamptz not null default now()
);

revoke all on table private.account_action_attempts from public, anon, authenticated;
revoke all on table private.account_deletion_receipts from public, anon, authenticated;

create or replace function private.require_recent_auth(
  maximum_age_seconds integer default 300
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  issued_at bigint := nullif(auth.jwt() ->> 'iat', '')::bigint;
  current_epoch bigint := floor(extract(epoch from clock_timestamp()))::bigint;
begin
  if current_user_id is null
    or issued_at is null
    or maximum_age_seconds < 1
    or maximum_age_seconds > 900
    or issued_at > current_epoch + 30
    or current_epoch - issued_at > maximum_age_seconds then
    raise exception 'RECENT_AUTH_REQUIRED' using errcode = '42501';
  end if;

  return current_user_id;
end;
$$;

create or replace function public.begin_account_action(
  action_name text,
  network_sha256 text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_session_id text := auth.jwt() ->> 'session_id';
  attempt_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if action_name not in ('export', 'delete')
    or network_sha256 !~ '^[0-9a-f]{64}$'
    or current_session_id is null
    or char_length(current_session_id) > 128 then
    raise exception 'INVALID_ACCOUNT_ACTION' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('account-action-user:' || current_user_id::text || ':' || action_name, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended('account-action-network:' || network_sha256 || ':' || action_name, 0)
  );

  delete from private.account_action_attempts
  where created_at <= now() - interval '24 hours';

  if (
    select count(*)
    from private.account_action_attempts
    where user_id = current_user_id
      and private.account_action_attempts.action_name = begin_account_action.action_name
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'ACCOUNT_ACTION_RATE_LIMIT' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from private.account_action_attempts
    where private.account_action_attempts.network_sha256 = begin_account_action.network_sha256
      and private.account_action_attempts.action_name = begin_account_action.action_name
      and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'ACCOUNT_ACTION_NETWORK_LIMIT' using errcode = 'P0001';
  end if;

  insert into private.account_action_attempts (
    user_id, action_name, auth_session_id, network_sha256
  ) values (
    current_user_id,
    begin_account_action.action_name,
    current_session_id,
    begin_account_action.network_sha256
  )
  returning id into attempt_id;

  return attempt_id;
end;
$$;

create or replace function public.finish_account_action(
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

  if safe_result_code !~ '^[A-Z0-9_]{1,64}$' then
    raise exception 'INVALID_RESULT_CODE' using errcode = '22023';
  end if;

  update private.account_action_attempts
  set consumed_at = now(),
      safe_result_code = finish_account_action.safe_result_code
  where id = attempt_id
    and user_id = current_user_id
    and consumed_at is null;
end;
$$;

create or replace function private.consume_account_action(
  attempt_id uuid,
  expected_action text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := private.require_recent_auth(300);
  current_session_id text := auth.jwt() ->> 'session_id';
begin
  update private.account_action_attempts
  set consumed_at = now(), safe_result_code = 'SUCCESS'
  where id = attempt_id
    and user_id = current_user_id
    and action_name = expected_action
    and auth_session_id <> current_session_id
    and consumed_at is null
    and created_at > now() - interval '10 minutes';

  if not found then
    if exists (
      select 1 from private.account_action_attempts
      where id = attempt_id
        and user_id = current_user_id
        and action_name = expected_action
        and consumed_at is null
        and auth_session_id = current_session_id
    ) then
      raise exception 'ACCOUNT_REAUTH_REQUIRED' using errcode = '42501';
    end if;

    raise exception 'INVALID_ACCOUNT_ACTION_PERMIT' using errcode = '42501';
  end if;

  return current_user_id;
end;
$$;

create or replace function public.save_cancellation_guide(
  target_subscription_id uuid,
  expected_guide_updated_at timestamptz default null,
  guide_cancellation_url text default null,
  guide_phone_number text default null,
  guide_instructions text default null,
  guide_verified_at date default null,
  guide_user_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_guide public.cancellation_guides%rowtype;
  saved_id uuid;
begin
  if current_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.subscriptions
    where id = target_subscription_id
      and user_id = current_user_id
      and archived_at is null
  ) then
    raise exception 'GUIDE_CONFLICT' using errcode = 'P0001';
  end if;

  select * into current_guide
  from public.cancellation_guides
  where subscription_id = target_subscription_id
    and user_id = current_user_id
  for update;

  if found then
    if expected_guide_updated_at is null
      or current_guide.updated_at <> expected_guide_updated_at then
      raise exception 'GUIDE_CONFLICT' using errcode = 'P0001';
    end if;

    if num_nonnulls(
      guide_cancellation_url,
      guide_phone_number,
      guide_instructions,
      guide_verified_at,
      guide_user_notes
    ) = 0 then
      delete from public.cancellation_guides
      where id = current_guide.id and user_id = current_user_id;
      return null;
    end if;

    update public.cancellation_guides
    set cancellation_url = guide_cancellation_url,
        phone_number = guide_phone_number,
        instructions = guide_instructions,
        verified_at = guide_verified_at,
        user_notes = guide_user_notes
    where id = current_guide.id
      and user_id = current_user_id
    returning id into saved_id;
  else
    if expected_guide_updated_at is not null then
      raise exception 'GUIDE_CONFLICT' using errcode = 'P0001';
    end if;

    if num_nonnulls(
      guide_cancellation_url,
      guide_phone_number,
      guide_instructions,
      guide_verified_at,
      guide_user_notes
    ) = 0 then
      return null;
    end if;

    insert into public.cancellation_guides (
      user_id,
      subscription_id,
      cancellation_url,
      phone_number,
      instructions,
      verified_at,
      user_notes
    ) values (
      current_user_id,
      target_subscription_id,
      guide_cancellation_url,
      guide_phone_number,
      guide_instructions,
      guide_verified_at,
      guide_user_notes
    )
    returning id into saved_id;
  end if;

  return saved_id;
end;
$$;

create or replace function public.export_current_user_data(
  action_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := private.consume_account_action(action_attempt_id, 'export');
  profile_id uuid;
begin
  select id into profile_id
  from public.profiles
  where user_id = current_user_id;

  insert into public.audit_events (
    user_id, event_type, resource_type, resource_id, result
  ) values (
    current_user_id, 'account.exported', 'profiles', profile_id, 'success'
  );

  return jsonb_build_object(
    'schema_version', 1,
    'generated_at', clock_timestamp(),
    'profile', (
      select jsonb_build_object(
        'preferred_currency', preferred_currency,
        'locale', locale,
        'time_zone', time_zone,
        'overlap_threshold', overlap_threshold,
        'renewal_reminders_enabled', renewal_reminders_enabled,
        'trial_reminders_enabled', trial_reminders_enabled,
        'onboarding_completed_at', onboarding_completed_at,
        'created_at', created_at,
        'updated_at', updated_at
      )
      from public.profiles where user_id = current_user_id
    ),
    'subscriptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'merchant_name', merchant_name, 'display_name', display_name,
        'category', category, 'amount_minor', amount_minor, 'currency', currency,
        'billing_frequency', billing_frequency,
        'custom_interval_days', custom_interval_days,
        'next_billing_date', next_billing_date, 'start_date', start_date,
        'trial_end_date', trial_end_date, 'status', status,
        'payment_method_nickname', payment_method_nickname, 'website', website,
        'cancellation_url', cancellation_url,
        'cancellation_instructions', cancellation_instructions,
        'notes', notes, 'reminder_lead_days', reminder_lead_days,
        'source', source, 'confidence_score', confidence_score,
        'source_import_id', source_import_id, 'archived_at', archived_at,
        'provider_cancelled_at', provider_cancelled_at,
        'realized_monthly_minor', realized_monthly_minor,
        'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.subscriptions where user_id = current_user_id
    ), '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'statement_import_id', statement_import_id,
        'subscription_id', subscription_id, 'transaction_date', transaction_date,
        'normalized_merchant', normalized_merchant, 'amount_minor', amount_minor,
        'currency', currency, 'created_at', created_at
      ) order by created_at) from public.transactions where user_id = current_user_id
    ), '[]'::jsonb),
    'statement_imports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'status', status, 'file_size_bytes', file_size_bytes,
        'row_count', row_count, 'accepted_count', accepted_count,
        'rejected_count', rejected_count, 'safe_error_code', safe_error_code,
        'completed_at', completed_at, 'created_at', created_at
      ) order by created_at) from public.statement_imports where user_id = current_user_id
    ), '[]'::jsonb),
    'import_column_mappings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'statement_import_id', statement_import_id,
        'date_column', date_column, 'description_column', description_column,
        'amount_column', amount_column, 'debit_column', debit_column,
        'credit_column', credit_column, 'date_format', date_format,
        'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.import_column_mappings where user_id = current_user_id
    ), '[]'::jsonb),
    'merchant_aliases', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'alias', alias, 'normalized_merchant', normalized_merchant,
        'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.merchant_aliases where user_id = current_user_id
    ), '[]'::jsonb),
    'import_suggestions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'statement_import_id', statement_import_id,
        'normalized_merchant', normalized_merchant, 'display_name', display_name,
        'amount_minor', amount_minor, 'currency', currency,
        'billing_frequency', billing_frequency,
        'next_billing_date', next_billing_date, 'start_date', start_date,
        'confidence_score', confidence_score, 'reason_code', reason_code,
        'reason_summary', reason_summary, 'decision', decision,
        'subscription_id', subscription_id, 'created_at', created_at,
        'updated_at', updated_at
      ) order by created_at) from public.import_suggestions where user_id = current_user_id
    ), '[]'::jsonb),
    'price_history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'subscription_id', subscription_id,
        'previous_amount_minor', previous_amount_minor,
        'new_amount_minor', new_amount_minor,
        'percentage_basis_points', percentage_basis_points,
        'detected_at', detected_at, 'confirmed_at', confirmed_at,
        'source_transaction_id', source_transaction_id, 'created_at', created_at
      ) order by created_at) from public.subscription_price_history where user_id = current_user_id
    ), '[]'::jsonb),
    'reminders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'subscription_id', subscription_id,
        'import_suggestion_id', import_suggestion_id, 'reminder_type', reminder_type,
        'status', status, 'event_date', event_date, 'due_at', due_at,
        'read_at', read_at, 'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.reminders where user_id = current_user_id
    ), '[]'::jsonb),
    'budgets', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'monthly_limit_minor', monthly_limit_minor, 'currency', currency,
        'effective_from', effective_from, 'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.budgets where user_id = current_user_id
    ), '[]'::jsonb),
    'savings_goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'monthly_target_minor', monthly_target_minor,
        'realized_monthly_minor', realized_monthly_minor, 'currency', currency,
        'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.savings_goals where user_id = current_user_id
    ), '[]'::jsonb),
    'cancellation_guides', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'subscription_id', subscription_id,
        'cancellation_url', cancellation_url, 'phone_number', phone_number,
        'instructions', instructions, 'verified_at', verified_at,
        'user_notes', user_notes, 'created_at', created_at, 'updated_at', updated_at
      ) order by created_at) from public.cancellation_guides where user_id = current_user_id
    ), '[]'::jsonb),
    'audit_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'event_type', event_type, 'resource_type', resource_type,
        'resource_id', resource_id, 'result', result,
        'safe_reason_code', safe_reason_code, 'created_at', created_at
      ) order by created_at) from public.audit_events where user_id = current_user_id
    ), '[]'::jsonb),
    'security_action_attempts', jsonb_build_object(
      'statement_imports', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', id, 'safe_result_code', safe_result_code,
          'consumed_at', consumed_at, 'created_at', created_at
        ) order by created_at)
        from private.import_attempts where user_id = current_user_id
      ), '[]'::jsonb),
      'account_actions', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', id, 'action_name', action_name,
          'safe_result_code', safe_result_code,
          'consumed_at', consumed_at, 'created_at', created_at
        ) order by created_at)
        from private.account_action_attempts where user_id = current_user_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

create or replace function public.delete_current_user(
  action_attempt_id uuid,
  confirmation text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := private.consume_account_action(action_attempt_id, 'delete');
  receipt_id uuid;
begin
  if confirmation <> 'DELETE MY ACCOUNT' then
    raise exception 'INVALID_DELETE_CONFIRMATION' using errcode = '22023';
  end if;

  insert into private.account_deletion_receipts default values
  returning id into receipt_id;

  delete from auth.users where id = current_user_id;

  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0001';
  end if;

  return receipt_id;
end;
$$;

revoke all on function private.require_recent_auth(integer) from public, anon, authenticated;
revoke all on function private.consume_account_action(uuid, text) from public, anon, authenticated;
revoke all on function public.begin_account_action(text, text) from public, anon;
revoke all on function public.finish_account_action(uuid, text) from public, anon;
revoke all on function public.save_cancellation_guide(uuid, timestamptz, text, text, text, date, text) from public, anon;
revoke all on function public.export_current_user_data(uuid) from public, anon;
revoke all on function public.delete_current_user(uuid, text) from public, anon;

grant execute on function public.begin_account_action(text, text) to authenticated;
grant execute on function public.finish_account_action(uuid, text) to authenticated;
grant execute on function public.save_cancellation_guide(uuid, timestamptz, text, text, text, date, text) to authenticated;
grant execute on function public.export_current_user_data(uuid) to authenticated;
grant execute on function public.delete_current_user(uuid, text) to authenticated;