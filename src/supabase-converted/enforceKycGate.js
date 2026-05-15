/* eslint-disable no-undef */
// ═══ CONVERTED: enforceKycGate ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, kycData, verificationStatus } = await req.json();
    if (!['submit', 'check', 'admin_review'].includes(action)) return Response.json({ error: 'Invalid action' }, { status: 400 });

    if (action === 'submit') {
      if (!kycData?.fullLegalName || !kycData?.dateOfBirth || !kycData?.address?.country) return Response.json({ error: 'Missing KYC fields' }, { status: 400 });
      const { data: creators } = await supabase.from('creator').select('*').eq('user_email', user.email).limit(1);
      if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
      const previousStatus = creators[0].kyc_status || 'not_started';
      await supabase.from('creator').update({ kyc_status: 'pending', kyc_data: kycData, kyc_submitted_at: new Date().toISOString() }).eq('id', creators[0].id);
      await supabase.from('kyc_audit_log').insert({ creator_id: user.email, action: 'submitted', previous_status: previousStatus, new_status: 'pending', reason: 'KYC submitted', ip_address: req.headers.get('x-forwarded-for') || 'unknown', timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true, message: 'KYC submitted. Review takes 2-5 business days.', status: 'pending' });
    }

    if (action === 'check') {
      const { data: creators } = await supabase.from('creator').select('kyc_status,kyc_submitted_at,kyc_reviewed_at,kyc_rejection_reason').eq('user_email', user.email).limit(1);
      const creator = (creators||[])[0];
      if (!creator) return Response.json({ error: 'Creator not found' }, { status: 404 });
      return Response.json({ kyc_status: creator.kyc_status || 'not_started', is_verified: creator.kyc_status === 'verified', submitted_at: creator.kyc_submitted_at, reviewed_at: creator.kyc_reviewed_at, rejection_reason: creator.kyc_rejection_reason || null });
    }

    if (action === 'admin_review') {
      const { data: profile } = await supabase.from('user').select('role').eq('email', user.email).single();
      if (profile?.role !== 'admin') return Response.json({ error: 'Admin required' }, { status: 403 });
      if (!verificationStatus?.creator_id || !['verified', 'rejected'].includes(verificationStatus.status)) return Response.json({ error: 'Invalid data' }, { status: 400 });
      const { data: creators } = await supabase.from('creator').select('id,kyc_status').eq('user_email', verificationStatus.creator_id).limit(1);
      if (!(creators||[])[0]) return Response.json({ error: 'Creator not found' }, { status: 404 });
      const updateData = { kyc_status: verificationStatus.status, kyc_reviewed_at: new Date().toISOString() };
      if (verificationStatus.status === 'rejected') updateData.kyc_rejection_reason = verificationStatus.reason || 'Verification failed';
      await supabase.from('creator').update(updateData).eq('id', creators[0].id);
      await supabase.from('kyc_audit_log').insert({ creator_id: verificationStatus.creator_id, action: verificationStatus.status === 'verified' ? 'approved' : 'rejected', previous_status: creators[0].kyc_status, new_status: verificationStatus.status, reason: verificationStatus.reason || 'Review completed', reviewer_email: user.email, timestamp_utc: new Date().toISOString() }).catch(() => {});
      return Response.json({ success: true, status: verificationStatus.status });
    }
  } catch (error) {
    console.error('[enforceKycGate] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});