import { stripe_register_webhook } from '@/api/base44Client';

// Call this once to register the chargeback handler
// Usage: GET /api/registerChargebackWebhook (admin only)

export default async function registerChargebackWebhook() {
  try {
    await stripe_register_webhook({
      events: [
        'charge.dispute.created',
        'charge.dispute.updated'
      ],
      function_name: 'stripeWebhook'
    });
    return { success: true, message: 'Chargeback webhooks registered' };
  } catch (error) {
    console.error('Failed to register chargeback webhooks:', error);
    throw error;
  }
}