/**
 * InputSanitizer — Production security layer for user-generated content.
 * Prevents XSS, injection, and abuse in chat messages, usernames,
 * stream titles, and other user inputs.
 */

// HTML entity encoding
const HTML_ENTITIES = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;',
  '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
};

const ENTITY_RE = /[&<>"'/]/g;

/** Escape HTML entities to prevent XSS */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(ENTITY_RE, (char) => HTML_ENTITIES[char] || char);
}

/** Strip all HTML tags */
export function stripHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '');
}

/** Sanitize a chat message — preserve emojis, strip HTML, enforce length */
export function sanitizeChat(message, maxLength = 500) {
  if (typeof message !== 'string') return '';
  let clean = stripHtml(message).trim();
  // Remove null bytes and control chars (except newline/tab)
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Collapse excessive whitespace
  clean = clean.replace(/\s{3,}/g, '  ');
  // Enforce length
  if (clean.length > maxLength) clean = clean.slice(0, maxLength);
  return clean;
}

/** Sanitize a username or display name */
export function sanitizeName(name, maxLength = 50) {
  if (typeof name !== 'string') return '';
  let clean = stripHtml(name).trim();
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  clean = clean.replace(/\s+/g, ' ');
  if (clean.length > maxLength) clean = clean.slice(0, maxLength);
  return clean;
}

/** Sanitize a stream title */
export function sanitizeTitle(title, maxLength = 100) {
  if (typeof title !== 'string') return '';
  let clean = stripHtml(title).trim();
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  if (clean.length > maxLength) clean = clean.slice(0, maxLength);
  return clean;
}

/** Validate and sanitize a URL — only allow http/https */
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

/** Sanitize a Zego room/user ID — alphanumeric + underscore/dash only */
export function sanitizeRoomId(id, maxLength = 128) {
  if (typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLength);
}

export function sanitizeUserId(id, maxLength = 64) {
  if (typeof id !== 'string') return '';
  return id.replace(/[^a-zA-Z0-9_@.+-]/g, '').slice(0, maxLength);
}