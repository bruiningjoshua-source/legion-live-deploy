import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { body } = await new Response(req.body).json().catch(() => ({ body: {} }));
    const phase = body?.phase || 'preview';

    // Helper: run SQL via rpc('exec_sql')
    const execSQL = async (sql) => {
      const { data, error } = await supabase.rpc('exec_sql', { sql_text: sql });
      if (error) return { error: error.message, hint: error.hint || null };
      return { success: true };
    };

    // ── BOOTSTRAP: Create exec_sql helper via raw REST ──
    if (phase === 'bootstrap') {
      // Try calling exec_sql first to see if it already exists
      const { error: testErr } = await supabase.rpc('exec_sql', { sql_text: 'SELECT 1;' });
      if (!testErr) {
        return Response.json({ success: true, message: 'exec_sql already exists and works.' });
      }

      // Create it via the raw PostgREST SQL endpoint (Supabase allows service_role to run SQL via pg functions)
      // We'll create it via a direct postgres connection through supabase edge function workaround
      // Actually, the simplest way: use the Supabase SQL Editor API
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: 'SELECT 1' })
      });

      return Response.json({
        message: 'exec_sql does not exist yet. Please run this SQL in your Supabase SQL Editor (Dashboard > SQL Editor):',
        sql: `CREATE OR REPLACE FUNCTION exec_sql(sql_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_text;
  RETURN 'OK';
END;
$$;`,
        nextStep: 'After running the SQL above, call this function again with phase=test_bootstrap'
      });
    }

    if (phase === 'test_bootstrap') {
      const result = await execSQL('SELECT 1;');
      if (result.error) {
        return Response.json({ success: false, message: 'exec_sql not working yet', error: result.error });
      }
      return Response.json({ success: true, message: 'exec_sql is working! You can now run migration phases.' });
    }

    // ── PHASE 1A: updated_at trigger function ──
    if (phase === '1a_trigger_fn') {
      const r = await execSQL(`
        CREATE OR REPLACE FUNCTION public.set_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN NEW.updated_date = now(); RETURN NEW; END; $$;
      `);
      return Response.json({ phase: '1a', description: 'Created set_updated_at() trigger function', result: r });
    }

    // ── PHASE 1B: Attach updated_at triggers to all tables ──
    if (phase === '1b_triggers') {
      const tables = [
        'achievements', 'affiliate_clicks', 'affiliate_products', 'brand_campaigns',
        'chat_messages', 'clips', 'collab_requests', 'creator_guarantees',
        'creator_payout_methods', 'creator_payouts', 'creator_subscriptions', 'creators',
        'currency_purchases', 'direct_messages', 'fan_club_memberships', 'follows',
        'friendships', 'game_library', 'gift_transactions', 'gifting_events', 'gifts',
        'legion_companion_events', 'legion_companion_memory', 'moderation_actions',
        'notifications', 'polls', 'ppv_events', 'ppv_tickets', 'predictions',
        'quests', 'raids', 'scheduled_streams', 'stream_highlights', 'stream_moderators',
        'stream_products', 'streams', 'tips', 'user_bans', 'vlog_videos',
        'wallet_audit_logs', 'wallets', 'watch_streaks', 'daily_rewards', 'music'
      ];
      const results = [];
      for (const t of tables) {
        const r = await execSQL(`
          DROP TRIGGER IF EXISTS trg_updated_at ON public."${t}";
          CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public."${t}"
          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        `);
        results.push({ table: t, ...r });
      }
      return Response.json({ phase: '1b', description: 'Attached updated_at triggers', results });
    }

    // ── PHASE 1C: NOT NULL on critical columns ──
    if (phase === '1c_not_null') {
      const constraints = [
        { table: 'creator_payout_methods', column: 'creator_id' },
        { table: 'creator_payouts', column: 'creator_id' },
        { table: 'creator_subscriptions', column: 'creator_id' },
        { table: 'wallet_audit_logs', column: 'wallet_id' },
        { table: 'stream_highlights', column: 'creator_id' },
      ];
      const results = [];
      for (const c of constraints) {
        await execSQL(`UPDATE public."${c.table}" SET "${c.column}" = '' WHERE "${c.column}" IS NULL;`);
        const r = await execSQL(`ALTER TABLE public."${c.table}" ALTER COLUMN "${c.column}" SET NOT NULL;`);
        results.push({ table: c.table, column: c.column, ...r });
      }
      return Response.json({ phase: '1c', description: 'Added NOT NULL constraints', results });
    }

    // ── PHASE 1D: Financial CHECK constraints ──
    if (phase === '1d_checks') {
      const checks = [
        { sql: `ALTER TABLE public.wallets ADD CONSTRAINT chk_denarii_non_negative CHECK (denarii_balance >= 0);`, label: 'wallets.denarii >= 0' },
        { sql: `ALTER TABLE public.wallets ADD CONSTRAINT chk_sestertii_non_negative CHECK (sestertii_balance >= 0);`, label: 'wallets.sestertii >= 0' },
        { sql: `ALTER TABLE public.wallets ADD CONSTRAINT chk_as_non_negative CHECK (as_balance >= 0);`, label: 'wallets.as >= 0' },
        { sql: `ALTER TABLE public.gifts ADD CONSTRAINT chk_gift_cost_positive CHECK (cost_denarii > 0);`, label: 'gifts.cost > 0' },
      ];
      const results = [];
      for (const c of checks) {
        const r = await execSQL(c.sql);
        results.push({ constraint: c.label, ...r });
      }
      return Response.json({ phase: '1d', description: 'Added financial CHECK constraints', results });
    }

    // ── PHASE 2: Indexes on lookup columns ──
    if (phase === '2_indexes') {
      const indexes = [
        'chat_messages(stream_id)', 'chat_messages(created_by)',
        'clips(clipper_email)', 'clips(stream_id)', 'clips(video_id)',
        'collab_requests(requester_email)', 'collab_requests(target_email)', 'collab_requests(status)',
        'creator_payout_methods(creator_id)', 'creator_payouts(creator_id)', 'creator_payouts(status)',
        'creator_subscriptions(creator_id)', 'creator_subscriptions(user_email)', 'creator_subscriptions(status)',
        'currency_purchases(user_email)', 'currency_purchases(status)',
        'direct_messages(sender_email)', 'direct_messages(receiver_email)',
        'fan_club_memberships(user_email)', 'fan_club_memberships(creator_id)',
        'follows(follower_email)', 'follows(creator_id)',
        'gift_transactions(sender_email)', 'gift_transactions(receiver_email)', 'gift_transactions(stream_id)',
        'moderation_actions(stream_id)', 'moderation_actions(moderator_email)',
        'notifications(user_email)', 'notifications(is_read)',
        'stream_highlights(stream_id)', 'stream_highlights(creator_id)',
        'stream_moderators(stream_id)', 'stream_products(stream_id)', 'stream_products(creator_email)',
        'streams(creator_id)', 'streams(status)',
        'tips(creator_id)', 'tips(tipper_email)', 'tips(stream_id)',
        'user_bans(user_email)', 'user_bans(stream_id)',
        'vlog_videos(creator_id)', 'vlog_videos(status)',
        'wallet_audit_logs(user_email)', 'wallet_audit_logs(wallet_id)', 'wallet_audit_logs(action)',
        'wallets(user_email)', 'watch_streaks(user_email)', 'daily_rewards(user_email)',
        'affiliate_clicks(video_id)', 'affiliate_products(creator_email)',
        'brand_campaigns(creator_email)', 'brand_campaigns(status)', 'gifting_events(is_active)',
      ];
      const results = [];
      for (const def of indexes) {
        const match = def.match(/^(\w+)\((.+)\)$/);
        if (!match) continue;
        const [, table, cols] = match;
        const idxName = `idx_${table}_${cols.replace(/,\s*/g, '_')}`;
        const r = await execSQL(`CREATE INDEX IF NOT EXISTS "${idxName}" ON public."${table}" (${cols});`);
        results.push({ index: idxName, ...r });
      }
      return Response.json({ phase: '2', description: `Created ${results.length} indexes`, results });
    }

    // ── PHASE 3: Atomic transfer_denarii function ──
    if (phase === '3_transfer_fn') {
      const r = await execSQL(`
        CREATE OR REPLACE FUNCTION public.transfer_denarii(
          p_sender_wallet_id uuid, p_receiver_wallet_id uuid, p_amount numeric, p_reason text DEFAULT 'gift'
        ) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
        DECLARE
          v_sb numeric; v_rb numeric; v_nsb numeric; v_nrb numeric;
          v_se text; v_re text;
        BEGIN
          IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;
          IF p_sender_wallet_id < p_receiver_wallet_id THEN
            SELECT denarii_balance, user_email INTO v_sb, v_se FROM public.wallets WHERE id = p_sender_wallet_id FOR UPDATE;
            SELECT denarii_balance, user_email INTO v_rb, v_re FROM public.wallets WHERE id = p_receiver_wallet_id FOR UPDATE;
          ELSE
            SELECT denarii_balance, user_email INTO v_rb, v_re FROM public.wallets WHERE id = p_receiver_wallet_id FOR UPDATE;
            SELECT denarii_balance, user_email INTO v_sb, v_se FROM public.wallets WHERE id = p_sender_wallet_id FOR UPDATE;
          END IF;
          IF v_sb IS NULL THEN RAISE EXCEPTION 'Sender wallet not found'; END IF;
          IF v_rb IS NULL THEN RAISE EXCEPTION 'Receiver wallet not found'; END IF;
          IF v_sb < p_amount THEN RAISE EXCEPTION 'Insufficient balance: have %, need %', v_sb, p_amount; END IF;
          v_nsb := v_sb - p_amount; v_nrb := v_rb + p_amount;
          UPDATE public.wallets SET denarii_balance = v_nsb, total_spent = COALESCE(total_spent,0) + p_amount WHERE id = p_sender_wallet_id;
          UPDATE public.wallets SET denarii_balance = v_nrb, total_earned = COALESCE(total_earned,0) + p_amount WHERE id = p_receiver_wallet_id;
          INSERT INTO public.wallet_audit_logs (user_email, wallet_id, action, amount_denarii, previous_balance, new_balance, reason, timestamp_utc)
            VALUES (v_se, p_sender_wallet_id::text, 'gift_send', -p_amount, v_sb, v_nsb, p_reason, now());
          INSERT INTO public.wallet_audit_logs (user_email, wallet_id, action, amount_denarii, previous_balance, new_balance, reason, timestamp_utc)
            VALUES (v_re, p_receiver_wallet_id::text, 'gift_receive', p_amount, v_rb, v_nrb, p_reason, now());
          RETURN jsonb_build_object('success', true, 'sender_new_balance', v_nsb, 'receiver_new_balance', v_nrb);
        END; $$;
      `);
      return Response.json({ phase: '3', description: 'Created atomic transfer_denarii() with deadlock-safe row locking', result: r });
    }

    // ── PREVIEW ──
    if (phase === 'preview') {
      return Response.json({
        phases: {
          'bootstrap': 'MANUAL STEP — You must paste SQL into Supabase SQL Editor first',
          'test_bootstrap': 'Verify exec_sql works',
          '1a_trigger_fn': 'Create set_updated_at() trigger function',
          '1b_triggers': 'Attach updated_at triggers to all 44 tables',
          '1c_not_null': 'NOT NULL on 5 critical columns',
          '1d_checks': 'Financial CHECK constraints (no negative balances)',
          '2_indexes': 'Create ~54 missing indexes',
          '3_transfer_fn': 'Atomic transfer_denarii() with deadlock-safe locking',
        },
        order: ['bootstrap', 'test_bootstrap', '1a_trigger_fn', '1b_triggers', '1c_not_null', '1d_checks', '2_indexes', '3_transfer_fn']
      });
    }

    return Response.json({ error: `Unknown phase: ${phase}` });
  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});