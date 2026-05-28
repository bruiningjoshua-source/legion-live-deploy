import { createClient } from '@supabase/supabase-js';

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const getSupabase = (event) => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase environment is not configured');
  }

  return createClient(url, key, {
    global: {
      headers: {
        Authorization: event.headers.authorization || event.headers.Authorization || `Bearer ${key}`,
      },
    },
  });
};

const getCurrentUser = async (supabase, event) => {
  const authorization = event.headers.authorization || event.headers.Authorization;
  if (!authorization) return null;
  const token = authorization.replace(/^Bearer\s+/i, '');
  const { data } = await supabase.auth.getUser(token);
  return data?.user || null;
};

const handlers = {
  async clearLiveStreams({ supabase }) {
    const { error: streamError } = await supabase
      .from('streams')
      .update({ status: 'ended', viewer_count: 0, ended_at: new Date().toISOString() })
      .eq('status', 'live');
    if (streamError) throw streamError;

    const { error: creatorError } = await supabase
      .from('creators')
      .update({ is_live: false, current_stream_id: null })
      .eq('is_live', true);
    if (creatorError) throw creatorError;

    return { success: true };
  },

  async updateViewerCount({ supabase, params }) {
    const { streamId, viewerCount } = params || {};
    if (!streamId || Number.isNaN(Number(viewerCount))) {
      return json(400, { error: 'streamId and viewerCount are required' });
    }

    const { data, error } = await supabase
      .from('streams')
      .update({ viewer_count: Math.max(0, Number(viewerCount)) })
      .eq('id', streamId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, stream: data };
  },

  async sendGift({ supabase, user, params }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const { senderWalletId, receiverWalletId, amountDenarii, reason, relatedEntityId, giftId, streamId, receiverEmail, receiverCreatorId } = params || {};
    if (!senderWalletId || !receiverWalletId || !amountDenarii) {
      return json(400, { error: 'senderWalletId, receiverWalletId, and amountDenarii are required' });
    }

    const { data: transfer, error: transferError } = await supabase.rpc('transfer_denarii', {
      p_sender_wallet_id: senderWalletId,
      p_receiver_wallet_id: receiverWalletId,
      p_amount: amountDenarii,
      p_reason: reason || 'gift',
      p_related_entity_id: relatedEntityId || null,
    });
    if (transferError) throw transferError;

    const { data: transaction, error: txError } = await supabase
      .from('gift_transactions')
      .insert({
        gift_id: giftId || null,
        stream_id: streamId || null,
        sender_email: user.email,
        receiver_email: receiverEmail || null,
        receiver_creator_id: receiverCreatorId || null,
        amount_denarii: amountDenarii,
        metadata: { reason: reason || 'gift' },
      })
      .select()
      .single();
    if (txError) throw txError;

    return { success: true, transfer, transaction };
  },

  async requestWithdrawal({ supabase, user, params }) {
    if (!user?.email) return json(401, { error: 'Authentication required' });

    const amountDenarii = Number(params?.amount_denarii || params?.amountDenarii);
    if (!amountDenarii || amountDenarii <= 0) {
      return json(400, { error: 'A positive withdrawal amount is required' });
    }

    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('id,user_email')
      .eq('user_email', user.email)
      .single();
    if (creatorError) throw creatorError;

    const { data, error } = await supabase
      .from('creator_payouts')
      .insert({
        creator_id: creator.id,
        user_email: user.email,
        amount_denarii: amountDenarii,
        status: 'pending',
        metadata: params || {},
      })
      .select()
      .single();
    if (error) throw error;

    return { success: true, payout: data };
  },
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { functionName, params } = JSON.parse(event.body || '{}');
    if (!functionName) return json(400, { error: 'functionName is required' });

    const handler = handlers[functionName];
    if (!handler) return json(404, { error: `No Netlify route for ${functionName}` });

    const supabase = getSupabase(event);
    const user = await getCurrentUser(supabase, event);
    const result = await handler({ supabase, user, params, event });

    if (result?.statusCode) return result;
    return json(200, result);
  } catch (error) {
    return json(500, { error: error.message || 'Function failed' });
  }
};
