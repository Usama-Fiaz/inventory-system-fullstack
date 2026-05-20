const CURRENCY_STORAGE_KEY = '__INVENTORY_CURRENCY__';

export const CURRENCIES = [
  { code: 'GBP', label: 'Pound (GBP)' },
  { code: 'USD', label: 'Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'AED', label: 'DHS (AED)' },
  { code: 'PKR', label: 'PKR (PKR)' },
];

export function getCurrencyCode() {
  try {
    const v = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (v && typeof v === 'string') return v;
  } catch {
    // ignore
  }
  return 'USD';
}

export function setCurrencyCode(code) {
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, String(code || 'USD'));
  } catch {
    // ignore
  }
}

export function formatMoney(value, opts = {}) {
  const {
    currency,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = opts;

  const amount = Number(value || 0);
  const code = currency || getCurrencyCode();

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    return amount.toFixed(maximumFractionDigits);
  }
}
