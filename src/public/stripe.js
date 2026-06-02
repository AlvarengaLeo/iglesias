import { loadStripe } from '@stripe/stripe-js';

// Portal donations are DIRECT CHARGES on the church's connected account, so
// Stripe.js must be initialized with the platform publishable key AND the
// connected account id. Memoize one promise per connected account.
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const cache = new Map();

export function getStripe(stripeAccount) {
  if (!pk || !stripeAccount) return null;
  if (!cache.has(stripeAccount)) {
    cache.set(stripeAccount, loadStripe(pk, { stripeAccount }));
  }
  return cache.get(stripeAccount);
}

// Payment Element appearance, themed to the church's brand color.
export function donationAppearance(primaryColor) {
  return {
    theme: 'stripe',
    variables: {
      colorPrimary: primaryColor || '#2348C4',
      fontFamily: 'inherit',
      borderRadius: '12px',
    },
  };
}
