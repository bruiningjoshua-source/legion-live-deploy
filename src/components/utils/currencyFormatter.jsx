/**
 * Currency formatting utility for creator earnings.
 * 
 * Canonical rate: 180 Denarii = $1 USD
 * Creator share: 60% of gift face value
 * 
 * Local currency conversion uses approximate rates.
 * For real payouts, server-side rates from a live FX API should be used.
 */

export const DENARII_PER_USD = 180;
export const CREATOR_SHARE = 0.60;

// Approximate exchange rates (USD base) — updated periodically
// In production, these would come from a backend FX service
const FX_RATES = {
  USD: 1,
  CAD: 1.36,
  EUR: 0.92,
  GBP: 0.79,
  AUD: 1.53,
  JPY: 154.5,
  INR: 83.4,
  BRL: 4.97,
  MXN: 17.2,
  PHP: 56.3,
  NGN: 1550,
  KRW: 1330,
  ZAR: 18.7,
  GHS: 15.4,
  KES: 153,
  TRY: 32.5,
  IDR: 15700,
  THB: 35.8,
  VND: 25300,
  COP: 3950,
  ARS: 870,
  EGP: 47.5,
  PKR: 278,
  BDT: 110,
  PLN: 3.97,
  SEK: 10.5,
  NOK: 10.7,
  DKK: 6.87,
  CHF: 0.88,
  NZD: 1.64,
  SGD: 1.34,
  HKD: 7.82,
  TWD: 31.5,
  MYR: 4.72,
  CLP: 935,
  PEN: 3.72,
  UAH: 41.2,
  RON: 4.57,
  HUF: 356,
  CZK: 22.8,
  ILS: 3.67,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
};

/**
 * Detect the user's likely local currency from their browser locale.
 */
export function detectLocalCurrency() {
  try {
    const locale = navigator.language || 'en-US';
    // Use Intl to detect the currency for the user's region
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' })
      .resolvedOptions();
    
    // Map common locales to currencies
    const localeToCurrency = {
      'en-US': 'USD', 'en-CA': 'CAD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-NZ': 'NZD',
      'en-IN': 'INR', 'en-NG': 'NGN', 'en-KE': 'KES', 'en-GH': 'GHS', 'en-ZA': 'ZAR',
      'en-PH': 'PHP', 'en-SG': 'SGD', 'en-HK': 'HKD', 'en-MY': 'MYR',
      'fr-FR': 'EUR', 'de-DE': 'EUR', 'es-ES': 'EUR', 'it-IT': 'EUR', 'nl-NL': 'EUR',
      'pt-PT': 'EUR', 'fi-FI': 'EUR', 'el-GR': 'EUR', 'sk-SK': 'EUR', 'sl-SI': 'EUR',
      'et-EE': 'EUR', 'lv-LV': 'EUR', 'lt-LT': 'EUR',
      'pt-BR': 'BRL', 'es-MX': 'MXN', 'es-AR': 'ARS', 'es-CO': 'COP', 'es-CL': 'CLP',
      'es-PE': 'PEN',
      'ja-JP': 'JPY', 'ko-KR': 'KRW', 'zh-TW': 'TWD', 'zh-CN': 'CNY', 'zh-HK': 'HKD',
      'th-TH': 'THB', 'vi-VN': 'VND', 'id-ID': 'IDR', 'ms-MY': 'MYR',
      'tr-TR': 'TRY', 'ar-SA': 'SAR', 'ar-AE': 'AED', 'ar-QA': 'QAR', 'ar-KW': 'KWD',
      'ar-EG': 'EGP', 'he-IL': 'ILS',
      'pl-PL': 'PLN', 'cs-CZ': 'CZK', 'hu-HU': 'HUF', 'ro-RO': 'RON', 'uk-UA': 'UAH',
      'sv-SE': 'SEK', 'nb-NO': 'NOK', 'da-DK': 'DKK', 'fr-CH': 'CHF', 'de-CH': 'CHF',
      'hi-IN': 'INR', 'bn-BD': 'BDT', 'ur-PK': 'PKR',
    };

    const currency = localeToCurrency[locale] || localeToCurrency[locale.split('-')[0]] || 'USD';
    return currency;
  } catch {
    return 'USD';
  }
}

/**
 * Convert denarii to USD (creator's 60% share already applied upstream).
 */
export function denariiToUsd(denarii) {
  return denarii / DENARII_PER_USD;
}

/**
 * Convert USD to a local currency amount.
 */
export function usdToLocal(usdAmount, currencyCode = 'USD') {
  const rate = FX_RATES[currencyCode] || 1;
  return usdAmount * rate;
}

/**
 * Format a USD amount in the user's local currency using Intl.
 */
export function formatLocalCurrency(usdAmount, currencyCode = null) {
  const currency = currencyCode || detectLocalCurrency();
  const localAmount = usdToLocal(usdAmount, currency);
  
  try {
    return new Intl.NumberFormat(navigator.language || 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(localAmount);
  } catch {
    return `$${usdAmount.toFixed(2)}`;
  }
}

/**
 * Format denarii as local currency (applying creator's share).
 * Use this for earnings displays where the 60% split needs to be shown.
 */
export function formatDenariiAsLocalEarnings(denarii, currencyCode = null) {
  const usd = denariiToUsd(denarii);
  return formatLocalCurrency(usd, currencyCode);
}

/**
 * Format denarii as USD string (no local conversion).
 */
export function formatDenariiAsUsd(denarii) {
  const usd = denariiToUsd(denarii);
  return `$${usd.toFixed(2)}`;
}