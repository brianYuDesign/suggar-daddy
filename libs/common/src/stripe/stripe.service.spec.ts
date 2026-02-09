import { StripeService } from './stripe.service';

describe('StripeService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env['STRIPE_SECRET_KEY'];
    delete process.env['STRIPE_WEBHOOK_SECRET'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should not throw when STRIPE_SECRET_KEY is missing', () => {
    expect(() => new StripeService()).not.toThrow();
  });

  it('isConfigured returns false when key not set', () => {
    const service = new StripeService();
    expect(service.isConfigured()).toBe(false);
  });

  it('isConfigured returns true when key is set', () => {
    process.env['STRIPE_SECRET_KEY'] = 'sk_test_123';
    const service = new StripeService();
    expect(service.isConfigured()).toBe(true);
  });

  it('getStripeInstance throws when key was not set', () => {
    const service = new StripeService();
    expect(() => service.getStripeInstance()).toThrow(/not configured/);
  });
});
