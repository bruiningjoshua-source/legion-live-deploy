/**
 * Format large numbers for display: 1200 → 1.2K, 1500000 → 1.5M
 */
export default function formatCount(n) {
  if (!n && n !== 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n || 0);
}