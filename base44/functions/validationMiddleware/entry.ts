/**
 * REQUEST VALIDATION MIDDLEWARE
 * Schema-based input validation for all endpoints
 */

export function validateRequest(data, schema) {
  if (!schema) return { valid: true };

  const errors = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  // Validate field types and constraints
  if (schema.properties) {
    for (const [field, rules] of Object.entries(schema.properties)) {
      if (!data.hasOwnProperty(field)) continue;

      const value = data[field];

      // Type validation
      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`Field ${field} must be string`);
      }
      if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`Field ${field} must be number`);
      }
      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`Field ${field} must be boolean`);
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field ${field} must be one of: ${rules.enum.join(', ')}`);
      }

      // String constraints
      if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push(`Field ${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push(`Field ${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`Field ${field} format is invalid`);
        }
      }

      // Number constraints
      if (typeof value === 'number') {
        if (rules.minimum !== undefined && value < rules.minimum) {
          errors.push(`Field ${field} must be >= ${rules.minimum}`);
        }
        if (rules.maximum !== undefined && value > rules.maximum) {
          errors.push(`Field ${field} must be <= ${rules.maximum}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

// Common validation schemas
export const SCHEMAS = {
  sendGift: {
    required: ['giftId', 'quantity', 'creatorId', 'streamId'],
    properties: {
      giftId: { type: 'string', minLength: 1, maxLength: 100 },
      quantity: { type: 'number', minimum: 1, maximum: 100 },
      creatorId: { type: 'string', minLength: 1, maxLength: 100 },
      streamId: { type: 'string', minLength: 1, maxLength: 100 }
    }
  },
  sendTip: {
    required: ['amount_usd', 'creator_id'],
    properties: {
      amount_usd: { type: 'number', minimum: 0.99, maximum: 50000 },
      creator_id: { type: 'string', minLength: 1, maxLength: 100 },
      message: { type: 'string', maxLength: 500 },
      is_anonymous: { type: 'boolean' }
    }
  },
  kycSubmit: {
    required: ['fullLegalName', 'dateOfBirth', 'address'],
    properties: {
      fullLegalName: { type: 'string', minLength: 3, maxLength: 200 },
      dateOfBirth: { type: 'string', pattern: '\\d{4}-\\d{2}-\\d{2}' },
      address: { type: 'object' },
      taxIdLast4: { type: 'string', pattern: '\\d{4}' }
    }
  },
  follow: {
    required: ['creator_id'],
    properties: {
      creator_id: { type: 'string', minLength: 1, maxLength: 100 }
    }
  },
  chatMessage: {
    required: ['stream_id', 'message'],
    properties: {
      stream_id: { type: 'string', minLength: 1, maxLength: 100 },
      message: { type: 'string', minLength: 1, maxLength: 1000 }
    }
  },
  payout: {
    required: ['amount_usd'],
    properties: {
      amount_usd: { type: 'number', minimum: 10, maximum: 100000 }
    }
  }
};

// Input sanitization
export function sanitizeString(input) {
  if (typeof input !== 'string') return input;
  // Remove HTML tags and dangerous characters
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>\"'`]/g, '') // Remove quotes and angle brackets
    .trim();
}

export function sanitizeObject(obj, schema) {
  if (!obj || typeof obj !== 'object') return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v => typeof v === 'string' ? sanitizeString(v) : v);
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value, schema?.properties?.[key]);
    }
  }
  return sanitized;
}