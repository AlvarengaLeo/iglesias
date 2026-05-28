// Money helpers: store as BIGINT cents, display as dollars.

export const centsToDollars = (cents) => Number(cents) / 100;

export const formatMoney = (cents, opts = {}) => {
  const { compact = false, currency = 'USD' } = opts;
  const amount = Number(cents) / 100;
  if (compact && amount >= 1000) {
    return '$' + (amount / 1000).toFixed(amount >= 10000 ? 0 : 1) + 'k';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const dollarsToCents = (input) => {
  if (typeof input === 'number') return Math.round(input * 100);
  const cleaned = String(input).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
