/* eslint-disable no-undef */
// ═══ CONVERTED: kycVerification ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
const KYC_THRESHOLDS = { PAYOUT_AMOUNT: 100, CUMULATIVE_EARNINGS: 600, MONTHLY_VOLUME: 500 };

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, fullLegalName, dateOfBirth, address, taxId, documentType, documentUrl, creatorId, approved, rejectionReason, amount } = await req.json();

    if (action === 'check_status') {
      const { data: creators } = await supabase.from('creator').select('kyc_status').eq('user_email', user.email).limit(1);
      return Response.json({ kycRequired: false, status: (creators||[])[0]?.kyc_status || 'not_started' });
    }
    if (action === 'submit') {
      if (!fullLegalName || !dateOfBirth || !address || !taxId) return Response.json({ error: 'Missing fields' }, { status: 400 });
      const { data: creators } = await supabase.from('creator').select('id').eq('user_email', user.email).limit(1);
      if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
      await supabase.from('creator').update({ kyc_status: 'pending', kyc_submitted_at: new Date().toISOString(), kyc_data: { fullLegalName, dateOfBirth, address, taxIdLast4: taxId.slice(-4), documentType, documentUrl } }).eq('id', creators[0].id);
      return Response.json({ success: true, status: 'pending', message: 'KYC submitted. Review in 1-3 business days.' });
    }
    if (action === 'admin_review') {
      const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
      if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const newStatus = approved ? 'verified' : 'rejected';
      await supabase.from('creator').update({ kyc_status: newStatus, kyc_reviewed_at: new Date().toISOString(), kyc_rejection_reason: rejectionReason || null }).eq('id', creatorId);
      return Response.json({ success: true, status: newStatus });
    }
    if (action === 'check_payout_eligibility') {
      const { data: creators } = await supabase.from('creator').select('id,kyc_status').eq('user_email', user.email).limit(1);
      if (!(creators||[])[0]) return Response.json({ eligible: false, reason: 'No creator profile' });
      if (amount >= KYC_THRESHOLDS.PAYOUT_AMOUNT && creators[0].kyc_status !== 'verified') return Response.json({ eligible: false, reason: `KYC required for $${KYC_THRESHOLDS.PAYOUT_AMOUNT}+` });
      const { data: methods } = await supabase.from('creator_payout_method').select('method_type').eq('creator_id', creators[0].id).eq('is_verified', true).limit(1);
      if (!(methods||[]).length) return Response.json({ eligible: false, reason: 'No verified payout method' });
      return Response.json({ eligible: true, kycStatus: creators[0].kyc_status });
    }
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});