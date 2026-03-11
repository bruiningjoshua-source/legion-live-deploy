/**
 * Input Validation & Sanitization Utilities
 * Used across all payment and user-facing functions
 */

export const validators = {
  // Stripe payment intent ID format: pi_xxxxx
  paymentIntentId: (id) => {
    if (!id || typeof id !== 'string') return null;
    const match = id.match(/^pi_[a-zA-Z0-9]{20,}$/);
    return match ? id : null;
  },

  // Email validation
  email: (email) => {
    if (!email || typeof email !== 'string') return null;
    const match = email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    return match ? email.toLowerCase() : null;
  },

  // USD amount validation (0.01 to 100,000)
  usdAmount: (amount) => {
    const num = Number(amount);
    return !isNaN(num) && num > 0 && num <= 100000 ? num : null;
  },

  // IP address validation (basic)
  ipAddress: (ip) => {
    if (!ip || typeof ip !== 'string') return null;
    const match = ip.match(/^(\d{1,3}\.){3}\d{1,3}$/);
    if (!match) return null;
    const parts = ip.split('.').map(Number);
    return parts.every(p => p >= 0 && p <= 255) ? ip : null;
  },

  // Country code (ISO 3166-1 alpha-2)
  countryCode: (code) => {
    if (!code || typeof code !== 'string') return null;
    return code.match(/^[A-Z]{2}$/) ? code : null;
  },

  // Device fingerprint (hex string, 32+ chars)
  deviceFingerprint: (fp) => {
    if (!fp || typeof fp !== 'string') return null;
    return fp.match(/^[a-f0-9]{32,}$/i) ? fp : null;
  }
};

export const sanitize = {
  // Remove XSS/SQL injection chars
  text: (str, maxLen = 2000) => {
    if (typeof str !== 'string') return '';
    return str
      .trim()
      .replace(/[<>\"'`]/g, '') // Remove HTML/SQL chars
      .substring(0, maxLen);
  },

  // Safe string ID (alphanumeric + underscore/dash)
  id: (str) => {
    if (typeof str !== 'string') return '';
    return String(str).replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 255);
  },

  // Safe category name
  category: (str) => {
    if (typeof str !== 'string') return '';
    return String(str).toLowerCase().replace(/[^a-z_]/g, '').substring(0, 50);
  }
};

export const validateRequest = (req, requiredFields) => {
  const errors = [];
  for (const field of requiredFields) {
    if (!req[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  return errors.length > 0 ? { valid: false, errors } : { valid: true };
};