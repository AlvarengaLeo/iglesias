import { loadStripe } from '@stripe/stripe-js';

// Module-level singleton — loadStripe is called once for the whole site.
// Null when the publishable key isn't set yet (pre-launch); the checkout modal
// degrades to a friendly "payments not configured" message in that case.
const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
export const stripePromise = pk ? loadStripe(pk) : null;

// Payment Element appearance — EBENEZER cobalt brand.
export const stripeAppearance = {
  theme: 'stripe',
  variables: {
    colorPrimary: '#2348C4',
    colorText: '#11131A',
    colorDanger: '#B4543F',
    fontFamily: 'Manrope, system-ui, sans-serif',
    borderRadius: '12px',
    spacingUnit: '4px',
  },
};
