/* eslint-disable no-undef */
// ═══ CONVERTED: processPPVWebhook ═══
// Stub — PPV webhook processing is handled inline in stripeWebhook.js
// This file exists as a placeholder for any future PPV-specific webhook logic.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const { event_id, user_email, session_id } = await req.json();
    if (!event_id || !user_email) return Response.json({ error: 'Missing fields' }, { status: 400 });

    // Check if ticket already exists
    const { data: existing } = await supabase.from('ppv_ticket').select('id').eq('event_id', event_id).eq('user_email', user_email).eq('status', 'valid').limit(1);
    if ((existing||[]).length) return Response.json({ success: true, message: 'Ticket already exists' });

    // Create ticket
    await supabase.from('ppv_ticket').insert({ event_id, user_email, status: 'valid', purchased_at: new Date().toISOString(), stripe_session_id: session_id });
    // Increment ticket count
    await supabase.rpc('increment_ppv_tickets', { event_id_param: event_id }).catch(() => {
      // Fallback: manual increment
      supabase.from('ppv_event').select('ticket_count').eq('id', event_id).single().then(({ data }) => {
        if (data) supabase.from('ppv_event').update({ ticket_count: (data.ticket_count||0) + 1 }).eq('id', event_id);
      }).catch(() => {});
    });

    return Response.json({ success: true, message: 'PPV ticket created' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});