import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Setup or update creator payout method
 * Stores payment details (encrypted at storage level by Base44)
 */
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method_type, account_holder_name, account_details, is_default } = await req.json();

    // Validate method type
    if (!['bank_account', 'paypal', 'crypto'].includes(method_type)) {
      return Response.json({ error: 'Invalid payout method' }, { status: 400 });
    }

    // Validate required fields based on method
    if (method_type === 'bank_account') {
      if (!account_holder_name || !account_details?.routing_number || !account_details?.account_number) {
        return Response.json({ error: 'Bank account requires routing and account numbers' }, { status: 400 });
      }
    } else if (method_type === 'paypal') {
      if (!account_details?.paypal_email) {
        return Response.json({ error: 'PayPal method requires email address' }, { status: 400 });
      }
    } else if (method_type === 'crypto') {
      if (!account_details?.wallet_address || !account_details?.coin_type) {
        return Response.json({ error: 'Crypto requires wallet address and coin type' }, { status: 400 });
      }
    }

    // Check if method already exists
    const existing = await base44.entities.CreatorPayoutMethod?.filter(
      { creator_email: user.email, method_type },
      null,
      1
    ).catch(() => []);

    let payoutMethod;
    if (existing?.length) {
      // Update existing
      payoutMethod = await base44.entities.CreatorPayoutMethod?.update(existing[0].id, {
        account_holder_name,
        account_details,
        is_default: is_default || false,
        updated_date: new Date().toISOString()
      }).catch(err => {
        console.error(`[setupPayoutMethod] Update failed for ${method_type}:`, err);
        throw err;
      });
    } else {
      // Create new
      payoutMethod = await base44.entities.CreatorPayoutMethod?.create({
        creator_email: user.email,
        method_type,
        account_holder_name,
        account_details,
        is_default: is_default || false,
        is_active: true
      }).catch(err => {
        console.error(`[setupPayoutMethod] Create failed for ${method_type}:`, err);
        throw err;
      });
    }

    // If setting as default, unset others
    if (is_default) {
      await base44.entities.CreatorPayoutMethod?.filter(
        { creator_email: user.email, method_type: { $ne: method_type } }
      ).then(others => {
        return Promise.all(
          others.map(m => 
            base44.entities.CreatorPayoutMethod?.update(m.id, { is_default: false }).catch(() => null)
          )
        );
      }).catch(() => null);
    }

    console.log(`[setupPayoutMethod] ${method_type} payout method setup/updated for ${user.email}`);

    return Response.json({
      success: true,
      method_id: payoutMethod.id,
      method_type,
      is_default,
      message: `${method_type} payout method successfully configured`
    });

  } catch (error) {
    console.error('[setupPayoutMethod] Error:', error);
    return Response.json({ error: error.message || 'Server error' }, { status: 500 });
  }
});