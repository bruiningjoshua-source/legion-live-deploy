/* eslint-disable no-undef */
// ═══ CONVERTED: transactionalEmail ═══
// NOTE: Base44's SendEmail integration replaced with Resend API.
// Set RESEND_API_KEY in Supabase secrets.
import { createClient } from 'npm:@supabase/supabase-js@2';

const EMAIL_TEMPLATES = {
  welcome: (data) => ({ subject: 'Welcome to Legion Live! 🎮', html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1f;color:#f5f5f5;padding:40px;border-radius:12px;"><h1 style="color:#d97706;text-align:center;">Welcome to Legion Live!</h1><p>Hey ${data.name||'there'}!</p><p>Welcome to the ultimate live streaming platform.</p></div>` }),
  purchase_confirmation: (data) => ({ subject: 'Purchase Confirmed - Legion Live', html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1f;color:#f5f5f5;padding:40px;border-radius:12px;"><h1 style="color:#22c55e;text-align:center;">✓ Purchase Confirmed</h1><p>Hey ${data.name||'there'}!</p><div style="background:#2a2a35;padding:20px;border-radius:8px;margin:20px 0;"><p><strong>Order ID:</strong> ${data.orderId}</p><p><strong>Item:</strong> ${data.itemName}</p><p><strong>Amount:</strong> $${data.amount}</p></div></div>` }),
  payout_processed: (data) => ({ subject: 'Payout Processed - Legion Live', html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1f;color:#f5f5f5;padding:40px;border-radius:12px;"><h1 style="color:#22c55e;text-align:center;">💰 Payout Processed</h1><p>Hey ${data.name||'Creator'}!</p><div style="background:#2a2a35;padding:20px;border-radius:8px;margin:20px 0;"><p><strong>Amount:</strong> $${data.amount}</p><p><strong>Method:</strong> ${data.payoutMethod}</p></div></div>` }),
  account_warning: (data) => ({ subject: '⚠️ Account Warning - Legion Live', html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1f;color:#f5f5f5;padding:40px;border-radius:12px;"><h1 style="color:#f59e0b;text-align:center;">⚠️ Account Warning</h1><p>Hey ${data.name||'there'},</p><p>Violation: ${data.violationType}</p></div>` }),
  weekly_digest: (data) => ({ subject: 'Your Weekly Recap - Legion Live', html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a1a1f;color:#f5f5f5;padding:40px;border-radius:12px;"><h1 style="color:#d97706;text-align:center;">📊 Weekly Recap</h1><p>Hey ${data.name||'Creator'}!</p><p>Views: ${data.views||0} | New Followers: +${data.newFollowers||0} | Gifts: ${data.giftsReceived||0} | Earnings: ${data.earnings||0} Denarii</p></div>` }),
};

function getTemplate(name, data) {
  return EMAIL_TEMPLATES[name] ? EMAIL_TEMPLATES[name](data) : { subject: 'Legion Live', html: '<p>Message from Legion Live</p>' };
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}` },
    body: JSON.stringify({ from: 'Legion Live <noreply@legionlive.com>', to, subject, html })
  });
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const data = await req.json();
    const { action } = data;

    switch (action) {
      case 'send': {
        const authHeader = req.headers.get('Authorization') || '';
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
        if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
        const template = getTemplate(data.templateName, data.templateData);
        await sendEmail(data.recipientEmail, template.subject, template.html);
        return Response.json({ success: true });
      }
      case 'send_welcome': {
        const template = getTemplate('welcome', { name: data.userName });
        await sendEmail(data.userEmail, template.subject, template.html);
        return Response.json({ success: true });
      }
      case 'send_purchase_confirmation': {
        const template = getTemplate('purchase_confirmation', { name: data.userName, orderId: data.orderId, itemName: data.itemName, amount: data.amount });
        await sendEmail(data.userEmail, template.subject, template.html);
        return Response.json({ success: true });
      }
      case 'send_payout_notification': {
        const template = getTemplate('payout_processed', { name: data.creatorName, amount: data.amount, payoutMethod: data.payoutMethod, reference: data.reference });
        await sendEmail(data.creatorEmail, template.subject, template.html);
        return Response.json({ success: true });
      }
      case 'send_chargeback_notice': {
        await sendEmail(data.userEmail, '⚠️ Chargeback Notice - Legion Live', `<p>Hey ${data.userName}, a chargeback was processed on your account. Dispute: ${data.chargeId}. ${data.reversedAmount} Denarii reversed.</p>`);
        return Response.json({ success: true });
      }
      case 'send_weekly_digest': {
        const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const [creatorsRes, giftsRes, followsRes] = await Promise.all([
          supabase.from('creator').select('*').order('follower_count', { ascending: false }).limit(500),
          supabase.from('gift_transaction').select('*').gte('created_date', oneWeekAgo).order('created_date', { ascending: false }).limit(5000),
          supabase.from('follow').select('*').gte('created_date', oneWeekAgo).order('created_date', { ascending: false }).limit(5000),
        ]);
        const creators = creatorsRes.data || [];
        const gifts = giftsRes.data || [];
        const follows = followsRes.data || [];
        const giftsByCreator = {};
        for (const g of gifts) { if (!giftsByCreator[g.receiver_creator_id]) giftsByCreator[g.receiver_creator_id] = []; giftsByCreator[g.receiver_creator_id].push(g); }
        const followsByCreator = {};
        for (const f of follows) { if (!followsByCreator[f.following_creator_id]) followsByCreator[f.following_creator_id] = []; followsByCreator[f.following_creator_id].push(f); }
        let sent = 0;
        for (const creator of creators) {
          if (!creator.user_email) continue;
          try {
            const cg = giftsByCreator[creator.id] || [];
            const template = getTemplate('weekly_digest', { name: creator.display_name, views: 0, newFollowers: (followsByCreator[creator.id] || []).length, giftsReceived: cg.length, earnings: cg.reduce((s, g) => s + (g.total_as_value || 0), 0) });
            await sendEmail(creator.user_email, template.subject, template.html);
            sent++;
          } catch (e) { console.error(`[digest] Failed: ${creator.user_email}:`, e.message); }
        }
        return Response.json({ success: true, sent });
      }
      default: return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Transactional email error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});