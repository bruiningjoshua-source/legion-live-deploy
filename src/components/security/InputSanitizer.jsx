// Input sanitization utilities for security

// HTML entity encoding to prevent XSS
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return text.replace(/[&<>"'`=/]/g, char => map[char]);
}

// Sanitize user input for database storage
export function sanitizeInput(input, options = {}) {
  const { 
    maxLength = 10000, 
    allowHtml = false,
    allowUrls = true,
    trimWhitespace = true 
  } = options;

  if (!input || typeof input !== 'string') return '';
  
  let sanitized = input;
  
  // Trim whitespace
  if (trimWhitespace) {
    sanitized = sanitized.trim();
  }
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  // Escape HTML if not allowed
  if (!allowHtml) {
    sanitized = escapeHtml(sanitized);
  }
  
  // Remove javascript: and data: URLs if URLs not allowed
  if (!allowUrls) {
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/data:/gi, '');
  }
  
  return sanitized;
}

// Sanitize email
export function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return '';
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

// Sanitize URL
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') return '';
  
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }
  
  // Ensure valid URL format
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return trimmed;
  } catch {
    // If it's a relative URL, allow it
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    return '';
  }
}

// Sanitize username/display name
export function sanitizeDisplayName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .trim()
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous chars
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .substring(0, 50);        // Limit length
}

// Sanitize chat message
export function sanitizeChatMessage(message) {
  if (!message || typeof message !== 'string') return '';
  
  return message
    .trim()
    .replace(/\0/g, '')       // Remove null bytes
    .substring(0, 500);       // Limit chat message length
}

// Validate and sanitize ID (for URL params, etc.)
export function sanitizeId(id) {
  if (!id || typeof id !== 'string') return '';
  
  // Only allow alphanumeric, hyphens, and underscores
  return id.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 100);
}

// Detect potential SQL injection attempts
export function detectSqlInjection(input) {
  if (!input || typeof input !== 'string') return false;
  
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b\s+\d+\s*=\s*\d+)/i,
    /(\bAND\b\s+\d+\s*=\s*\d+)/i,
    /(;\s*(SELECT|INSERT|UPDATE|DELETE|DROP))/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
}

// Detect potential XSS attempts
export function detectXss(input) {
  if (!input || typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<svg.*?onload/gi
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

export default {
  escapeHtml,
  sanitizeInput,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeDisplayName,
  sanitizeChatMessage,
  sanitizeId,
  detectSqlInjection,
  detectXss
};