alter table public.subscriptions
  drop constraint subscriptions_website_https,
  drop constraint subscriptions_cancellation_url_https;

alter table public.subscriptions
  add constraint subscriptions_website_https check (
    website is null
    or (
      website ~ '^https://[^/@[:space:]]+([/?#].*)?$'
      and website !~ '[[:cntrl:]]'
      and website !~* '%(0[0-9a-f]|1[0-9a-f]|7f)'
    )
  ),
  add constraint subscriptions_cancellation_url_https check (
    cancellation_url is null
    or (
      cancellation_url ~ '^https://[^/@[:space:]]+([/?#].*)?$'
      and cancellation_url !~ '[[:cntrl:]]'
      and cancellation_url !~* '%(0[0-9a-f]|1[0-9a-f]|7f)'
    )
  ),
  add constraint subscriptions_next_billing_date_order check (
    next_billing_date >= start_date
  );

grant insert (
  user_id,
  merchant_name,
  display_name,
  category,
  amount_minor,
  currency,
  billing_frequency,
  custom_interval_days,
  next_billing_date,
  start_date,
  trial_end_date,
  status,
  payment_method_nickname,
  website,
  cancellation_url,
  cancellation_instructions,
  notes,
  reminder_lead_days
) on table public.subscriptions to authenticated;

grant update (
  merchant_name,
  display_name,
  category,
  amount_minor,
  currency,
  billing_frequency,
  custom_interval_days,
  next_billing_date,
  start_date,
  trial_end_date,
  status,
  payment_method_nickname,
  website,
  cancellation_url,
  cancellation_instructions,
  notes,
  reminder_lead_days,
  archived_at
) on table public.subscriptions to authenticated;

grant delete on table public.subscriptions to authenticated;

create policy subscriptions_insert_owner
on public.subscriptions
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy subscriptions_update_owner
on public.subscriptions
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy subscriptions_delete_owner
on public.subscriptions
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
