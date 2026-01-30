import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Fraud detection rules and scoring
const FRAUD_SIGNALS = {
  // High risk signals (each worth 30+ points)
  NEW_ACCOUNT_LARGE_PURCHASE: { score: 40, description: 'New account making large purchase' },
  MULTIPLE_FAILED_PAYMENTS: { score: 35, description: 'Multiple failed payment attempts' },
  VELOCITY_ABUSE: { score: 40, description: 'Too many transactions in short time' },
  SUSPICIOUS_IP: { score: 30, description: 'IP associated with fraud' },
  
  // Medium risk signals (10-29 points)
  MISMATCHED_COUNTRY: { score: 25, description: 'Billing country differs from IP country' },
  DISPOSABLE_EMAIL: { score: 20, description: 'Using disposable email provider' },
  ODD_HOURS: { score: 15, description: 'Transaction at unusual hours' },
  ROUND_AMOUNTS: { score: 10, description: 'Suspicious round amount patterns' },
  
  // Low risk signals (1-9 points)
  FIRST_PURCHASE: { score: 5, description: 'First time purchaser' },
  MOBILE_DEVICE: { score: -5, description: 'Mobile device (slightly lower risk)' },
  RETURNING_CUSTOMER: { score: -10, description: 'Returning customer with good history' }
};

const RISK_THRESHOLDS = {
  LOW: 20,
  MEDIUM: 50,
  HIGH: 75
};

// Disposable email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakemailgenerator.com', 'yopmail.com'
];

function isDisposableEmail(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_DOMAINS.some(d => domain?.includes(d));
}

function checkVelocity(transactions, windowMinutes = 60) {
  const cutoff = Date.now() - (windowMinutes * 60 * 1000);
  const recentTransactions = transactions.filter(t => 
    new Date(t.created_date).getTime() > cutoff
  );
  return recentTransactions.length;
}

function isOddHours(timezone) {
  // Consider 2 AM - 5 AM as odd hours
  const hour = new Date().getUTCHours();
  return hour >= 2 && hour <= 5;
}

async function analyzeTransaction(base44, data) {
  const { 
    userEmail, 
    amount, 
    ipAddress, 
    userAgent,
    billingCountry 
  } = data;

  let fraudScore = 0;
  const signals = [];

  // Check user account age
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail }, null, 1);
    const user = users[0];
    
    if (user) {
      const accountAge = Date.now() - new Date(user.created_date).getTime();
      const hoursSinceCreation = accountAge / (1000 * 60 * 60);
      
      // New account making large purchase
      if (hoursSinceCreation < 24 && amount > 50) {
        fraudScore += FRAUD_SIGNALS.NEW_ACCOUNT_LARGE_PURCHASE.score;
        signals.push(FRAUD_SIGNALS.NEW_ACCOUNT_LARGE_PURCHASE.description);
      }
      
      // First purchase
      const purchases = await base44.asServiceRole.entities.CurrencyPurchase.filter(
        { user_email: userEmail, status: 'completed' }, null, 1
      );
      if (purchases.length === 0) {
        fraudScore += FRAUD_SIGNALS.FIRST_PURCHASE.score;
        signals.push(FRAUD_SIGNALS.FIRST_PURCHASE.description);
      } else {
        fraudScore += FRAUD_SIGNALS.RETURNING_CUSTOMER.score;
        signals.push(FRAUD_SIGNALS.RETURNING_CUSTOMER.description);
      }
    }
  } catch (e) {
    console.error('Error checking user:', e);
  }

  // Check transaction velocity
  try {
    const recentTransactions = await base44.asServiceRole.entities.CurrencyPurchase.filter(
      { user_email: userEmail }, '-created_date', 20
    );
    const velocityCount = checkVelocity(recentTransactions, 60);
    
    if (velocityCount > 5) {
      fraudScore += FRAUD_SIGNALS.VELOCITY_ABUSE.score;
      signals.push(FRAUD_SIGNALS.VELOCITY_ABUSE.description);
    }
  } catch (e) {
    console.error('Error checking velocity:', e);
  }

  // Check for disposable email
  if (isDisposableEmail(userEmail)) {
    fraudScore += FRAUD_SIGNALS.DISPOSABLE_EMAIL.score;
    signals.push(FRAUD_SIGNALS.DISPOSABLE_EMAIL.description);
  }

  // Check odd hours
  if (isOddHours()) {
    fraudScore += FRAUD_SIGNALS.ODD_HOURS.score;
    signals.push(FRAUD_SIGNALS.ODD_HOURS.description);
  }

  // Check for mobile device (lower risk)
  if (userAgent && /mobile|android|iphone/i.test(userAgent)) {
    fraudScore += FRAUD_SIGNALS.MOBILE_DEVICE.score;
    signals.push(FRAUD_SIGNALS.MOBILE_DEVICE.description);
  }

  // Determine risk level
  let riskLevel = 'low';
  if (fraudScore >= RISK_THRESHOLDS.HIGH) {
    riskLevel = 'high';
  } else if (fraudScore >= RISK_THRESHOLDS.MEDIUM) {
    riskLevel = 'medium';
  } else if (fraudScore >= RISK_THRESHOLDS.LOW) {
    riskLevel = 'low';
  }

  return {
    score: Math.max(0, fraudScore),
    riskLevel,
    signals,
    shouldBlock: riskLevel === 'high',
    requiresReview: riskLevel === 'medium'
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin or system call
    const user = await base44.auth.me();
    
    const data = await req.json();
    const { action } = data;

    if (action === 'analyze') {
      const result = await analyzeTransaction(base44, data);
      
      // Log high-risk transactions
      if (result.riskLevel === 'high' || result.requiresReview) {
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'fraud_detection',
          metric_name: result.riskLevel,
          metric_value: result.score,
          metadata: {
            userEmail: data.userEmail,
            amount: data.amount,
            signals: result.signals,
            timestamp: new Date().toISOString()
          }
        });
      }
      
      return Response.json(result);
    }

    if (action === 'report') {
      // Manual fraud report
      const { transactionId, reason, reporterEmail } = data;
      
      await base44.asServiceRole.entities.PlatformAnalytics.create({
        metric_type: 'fraud_report',
        metric_name: 'manual_report',
        metric_value: 1,
        metadata: {
          transactionId,
          reason,
          reporterEmail,
          timestamp: new Date().toISOString()
        }
      });
      
      return Response.json({ success: true, message: 'Fraud report submitted' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Fraud detection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});