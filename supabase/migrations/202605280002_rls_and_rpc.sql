alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_audit_logs enable row level security;
alter table public.watch_streaks enable row level security;
alter table public.gifts enable row level security;
alter table public.creators enable row level security;
alter table public.streams enable row level security;
alter table public.chat_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.gift_transactions enable row level security;
alter table public.follows enable row level security;
alter table public.creator_payout_methods enable row level security;
alter table public.creator_payouts enable row level security;
alter table public.content_violations enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.currency_purchases enable row level security;
alter table public.platform_analytics enable row level security;
alter table public.vlog_videos enable row level security;
alter table public.music enable row level security;
alter table public.base44_records enable row level security;

create policy "profiles_owner_or_admin_select" on public.profiles for select using (email = public.current_user_email() or public.is_admin());
create policy "profiles_owner_update" on public.profiles for update using (email = public.current_user_email() or public.is_admin()) with check (email = public.current_user_email() or public.is_admin());
create policy "profiles_owner_insert" on public.profiles for insert with check (email = public.current_user_email() or public.is_admin());

create policy "wallets_owner_or_admin_select" on public.wallets for select using (user_email = public.current_user_email() or public.is_admin());
create policy "wallets_owner_or_admin_insert" on public.wallets for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "wallets_owner_or_admin_update" on public.wallets for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "wallets_admin_delete" on public.wallets for delete using (public.is_admin());

create policy "wallet_audit_logs_owner_or_admin_select" on public.wallet_audit_logs for select using (user_email = public.current_user_email() or public.is_admin());
create policy "wallet_audit_logs_owner_or_admin_insert" on public.wallet_audit_logs for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "wallet_audit_logs_admin_update" on public.wallet_audit_logs for update using (public.is_admin()) with check (public.is_admin());
create policy "wallet_audit_logs_admin_delete" on public.wallet_audit_logs for delete using (public.is_admin());

create policy "watch_streaks_owner_or_admin_select" on public.watch_streaks for select using (user_email = public.current_user_email() or public.is_admin());
create policy "watch_streaks_owner_or_admin_insert" on public.watch_streaks for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "watch_streaks_owner_or_admin_update" on public.watch_streaks for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "watch_streaks_admin_delete" on public.watch_streaks for delete using (public.is_admin());

create policy "gifts_public_select" on public.gifts for select using (true);
create policy "gifts_admin_insert" on public.gifts for insert with check (public.is_admin());
create policy "gifts_admin_update" on public.gifts for update using (public.is_admin()) with check (public.is_admin());
create policy "gifts_admin_delete" on public.gifts for delete using (public.is_admin());

create policy "creators_public_select" on public.creators for select using (true);
create policy "creators_owner_or_admin_insert" on public.creators for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "creators_owner_or_admin_update" on public.creators for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "creators_admin_delete" on public.creators for delete using (public.is_admin());

create policy "streams_public_select" on public.streams for select using (true);
create policy "streams_creator_or_admin_insert" on public.streams for insert with check (creator_email = public.current_user_email() or public.is_admin());
create policy "streams_creator_or_admin_update" on public.streams for update using (creator_email = public.current_user_email() or public.is_admin()) with check (creator_email = public.current_user_email() or public.is_admin());
create policy "streams_admin_delete" on public.streams for delete using (public.is_admin());

create policy "chat_messages_public_select" on public.chat_messages for select using (true);
create policy "chat_messages_owner_insert" on public.chat_messages for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "chat_messages_owner_or_admin_update" on public.chat_messages for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "chat_messages_owner_or_admin_delete" on public.chat_messages for delete using (user_email = public.current_user_email() or public.is_admin());

create policy "notifications_owner_select" on public.notifications for select using (user_email = public.current_user_email() or public.is_admin());
create policy "notifications_owner_insert" on public.notifications for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "notifications_owner_update" on public.notifications for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "notifications_owner_delete" on public.notifications for delete using (user_email = public.current_user_email() or public.is_admin());

create policy "gift_transactions_participant_select" on public.gift_transactions for select using (sender_email = public.current_user_email() or receiver_email = public.current_user_email() or public.is_admin());
create policy "gift_transactions_sender_insert" on public.gift_transactions for insert with check (sender_email = public.current_user_email() or public.is_admin());
create policy "gift_transactions_admin_update" on public.gift_transactions for update using (public.is_admin()) with check (public.is_admin());
create policy "gift_transactions_admin_delete" on public.gift_transactions for delete using (public.is_admin());

create policy "follows_public_select" on public.follows for select using (true);
create policy "follows_owner_insert" on public.follows for insert with check (follower_email = public.current_user_email() or public.is_admin());
create policy "follows_owner_delete" on public.follows for delete using (follower_email = public.current_user_email() or public.is_admin());

create policy "creator_payout_methods_owner_select" on public.creator_payout_methods for select using (user_email = public.current_user_email() or public.is_admin());
create policy "creator_payout_methods_owner_insert" on public.creator_payout_methods for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "creator_payout_methods_owner_update" on public.creator_payout_methods for update using (user_email = public.current_user_email() or public.is_admin()) with check (user_email = public.current_user_email() or public.is_admin());
create policy "creator_payout_methods_owner_delete" on public.creator_payout_methods for delete using (user_email = public.current_user_email() or public.is_admin());

create policy "creator_payouts_owner_select" on public.creator_payouts for select using (user_email = public.current_user_email() or public.is_admin());
create policy "creator_payouts_owner_insert" on public.creator_payouts for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "creator_payouts_admin_update" on public.creator_payouts for update using (public.is_admin()) with check (public.is_admin());
create policy "creator_payouts_admin_delete" on public.creator_payouts for delete using (public.is_admin());

create policy "content_violations_owner_or_admin_select" on public.content_violations for select using (user_email = public.current_user_email() or moderator_email = public.current_user_email() or public.is_admin());
create policy "content_violations_authenticated_insert" on public.content_violations for insert with check (auth.uid() is not null);
create policy "content_violations_admin_update" on public.content_violations for update using (public.is_admin()) with check (public.is_admin());
create policy "content_violations_admin_delete" on public.content_violations for delete using (public.is_admin());

create policy "moderation_actions_admin_select" on public.moderation_actions for select using (moderator_email = public.current_user_email() or public.is_admin());
create policy "moderation_actions_admin_insert" on public.moderation_actions for insert with check (public.is_admin() or moderator_email = public.current_user_email());
create policy "moderation_actions_admin_update" on public.moderation_actions for update using (public.is_admin()) with check (public.is_admin());
create policy "moderation_actions_admin_delete" on public.moderation_actions for delete using (public.is_admin());

create policy "currency_purchases_owner_select" on public.currency_purchases for select using (user_email = public.current_user_email() or public.is_admin());
create policy "currency_purchases_owner_insert" on public.currency_purchases for insert with check (user_email = public.current_user_email() or public.is_admin());
create policy "currency_purchases_admin_update" on public.currency_purchases for update using (public.is_admin()) with check (public.is_admin());
create policy "currency_purchases_admin_delete" on public.currency_purchases for delete using (public.is_admin());

create policy "platform_analytics_admin_select" on public.platform_analytics for select using (public.is_admin() or user_email = public.current_user_email());
create policy "platform_analytics_authenticated_insert" on public.platform_analytics for insert with check (auth.uid() is not null or public.is_admin());
create policy "platform_analytics_admin_update" on public.platform_analytics for update using (public.is_admin()) with check (public.is_admin());
create policy "platform_analytics_admin_delete" on public.platform_analytics for delete using (public.is_admin());

create policy "vlog_videos_public_select" on public.vlog_videos for select using (is_published or creator_email = public.current_user_email() or public.is_admin());
create policy "vlog_videos_owner_insert" on public.vlog_videos for insert with check (creator_email = public.current_user_email() or public.is_admin());
create policy "vlog_videos_owner_update" on public.vlog_videos for update using (creator_email = public.current_user_email() or public.is_admin()) with check (creator_email = public.current_user_email() or public.is_admin());
create policy "vlog_videos_owner_delete" on public.vlog_videos for delete using (creator_email = public.current_user_email() or public.is_admin());

create policy "music_public_select" on public.music for select using (is_published or public.is_admin());
create policy "music_admin_insert" on public.music for insert with check (public.is_admin());
create policy "music_admin_update" on public.music for update using (public.is_admin()) with check (public.is_admin());
create policy "music_admin_delete" on public.music for delete using (public.is_admin());

create policy "base44_records_owner_select" on public.base44_records for select using (owner_email = public.current_user_email() or public.is_admin());
create policy "base44_records_owner_insert" on public.base44_records for insert with check (owner_email = public.current_user_email() or public.is_admin());
create policy "base44_records_owner_update" on public.base44_records for update using (owner_email = public.current_user_email() or public.is_admin()) with check (owner_email = public.current_user_email() or public.is_admin());
create policy "base44_records_owner_delete" on public.base44_records for delete using (owner_email = public.current_user_email() or public.is_admin());

create or replace function public.transfer_denarii(
  p_sender_wallet_id uuid,
  p_receiver_wallet_id uuid,
  p_amount numeric,
  p_reason text default 'gift',
  p_related_entity_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_balance numeric;
  v_receiver_balance numeric;
  v_sender_new_balance numeric;
  v_receiver_new_balance numeric;
  v_sender_email text;
  v_receiver_email text;
begin
  if p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if p_sender_wallet_id = p_receiver_wallet_id then
    raise exception 'Sender and receiver wallets must differ';
  end if;

  if p_sender_wallet_id < p_receiver_wallet_id then
    select denarii_balance, user_email into v_sender_balance, v_sender_email from public.wallets where id = p_sender_wallet_id for update;
    select denarii_balance, user_email into v_receiver_balance, v_receiver_email from public.wallets where id = p_receiver_wallet_id for update;
  else
    select denarii_balance, user_email into v_receiver_balance, v_receiver_email from public.wallets where id = p_receiver_wallet_id for update;
    select denarii_balance, user_email into v_sender_balance, v_sender_email from public.wallets where id = p_sender_wallet_id for update;
  end if;

  if v_sender_email is null then
    raise exception 'Sender wallet not found';
  end if;
  if v_receiver_email is null then
    raise exception 'Receiver wallet not found';
  end if;
  if v_sender_balance < p_amount then
    raise exception 'Insufficient balance';
  end if;

  v_sender_new_balance := v_sender_balance - p_amount;
  v_receiver_new_balance := v_receiver_balance + p_amount;

  update public.wallets
  set denarii_balance = v_sender_new_balance,
      total_spent = total_spent + p_amount
  where id = p_sender_wallet_id;

  update public.wallets
  set denarii_balance = v_receiver_new_balance,
      total_earned = total_earned + p_amount
  where id = p_receiver_wallet_id;

  insert into public.wallet_audit_logs (user_email, wallet_id, action, amount_denarii, previous_balance, new_balance, related_entity_id, reason)
  values (v_sender_email, p_sender_wallet_id, 'gift_send', -p_amount, v_sender_balance, v_sender_new_balance, p_related_entity_id, p_reason);

  insert into public.wallet_audit_logs (user_email, wallet_id, action, amount_denarii, previous_balance, new_balance, related_entity_id, reason)
  values (v_receiver_email, p_receiver_wallet_id, 'gift_receive', p_amount, v_receiver_balance, v_receiver_new_balance, p_related_entity_id, p_reason);

  return jsonb_build_object(
    'success', true,
    'sender_new_balance', v_sender_new_balance,
    'receiver_new_balance', v_receiver_new_balance
  );
end;
$$;

create or replace function public.record_currency_purchase(
  p_user_email text,
  p_amount_denarii numeric,
  p_amount_usd numeric,
  p_stripe_session_id text default null,
  p_stripe_payment_intent_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_previous_balance numeric;
  v_new_balance numeric;
  v_purchase_id uuid;
begin
  if p_amount_denarii <= 0 or p_amount_usd < 0 then
    raise exception 'Invalid purchase amount';
  end if;

  insert into public.wallets(user_email)
  values (p_user_email)
  on conflict (user_email) do nothing;

  select id, denarii_balance into v_wallet_id, v_previous_balance
  from public.wallets
  where user_email = p_user_email
  for update;

  v_new_balance := v_previous_balance + p_amount_denarii;

  update public.wallets
  set denarii_balance = v_new_balance,
      total_purchased_usd = total_purchased_usd + p_amount_usd,
      vip_points = vip_points + p_amount_denarii
  where id = v_wallet_id;

  insert into public.currency_purchases(user_email, amount_denarii, amount_usd, status, stripe_session_id, stripe_payment_intent_id, metadata)
  values (p_user_email, p_amount_denarii, p_amount_usd, 'completed', p_stripe_session_id, p_stripe_payment_intent_id, p_metadata)
  returning id into v_purchase_id;

  insert into public.wallet_audit_logs(user_email, wallet_id, action, amount_denarii, previous_balance, new_balance, related_entity_id, reason)
  values (p_user_email, v_wallet_id, 'purchase', p_amount_denarii, v_previous_balance, v_new_balance, v_purchase_id::text, 'Currency purchase');

  return v_purchase_id;
end;
$$;
