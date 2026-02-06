import Stripe from 'stripe';

export const getStripeClient = (): Stripe => {
  const apiKey = process.env['STRIPE_SECRET_KEY'];
  
  if (!apiKey) {
    throw new Error('STRIPE_SECRET_KEY is not defined');
  }

  return new Stripe(apiKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });
};

export const STRIPE_WEBHOOK_SECRET = process.env['STRIPE_WEBHOOK_SECRET'] || '';