import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const AUTHORIZED_ADMINS = [
  'admin@legionlive.io', 
  'support@legionlive.io', 
  'inthestixproductions@gmail.com', 
  'muggabuckerpro@gmail.com', 
  'rankincadence@gmail.com', 
  'invictaoperations@gmail.com', 
  'bruiningjoshua@gmail.com'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin' || !AUTHORIZED_ADMINS.includes(user.email)) {
      console.error('[adminListUsers] Unauthorized access attempt:', user?.email);
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[adminListUsers] Admin access granted for:', user.email);

    // Use service role to list users
    const users = await base44.asServiceRole.entities.User.list('-created_date', 100);

    return Response.json({ users });
  } catch (error) {
    console.error('[adminListUsers] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});