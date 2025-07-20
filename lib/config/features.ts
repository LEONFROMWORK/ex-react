// Feature flags configuration
export const features = {
  payment: {
    enabled: process.env.ENABLE_PAYMENT_FEATURES === 'true',
    // Individual payment provider flags
    tossPayments: process.env.ENABLE_PAYMENT_FEATURES === 'true' && !!process.env.TOSS_CLIENT_KEY,
    stripe: process.env.ENABLE_PAYMENT_FEATURES === 'true' && !!process.env.STRIPE_PUBLISHABLE_KEY,
  },
  demo: {
    enabled: process.env.NEXT_PUBLIC_DEMO_MODE === 'true',
  },
  auth: {
    skipEmailVerification: process.env.SKIP_EMAIL_VERIFICATION === 'true',
  },
  regional: {
    enabled: process.env.ENABLE_REGIONAL_ROUTING === 'true',
  },
}

// Helper function to check if any payment method is enabled
export const isPaymentEnabled = () => features.payment.enabled

// Helper function to check specific payment provider
export const isPaymentProviderEnabled = (provider: 'toss' | 'stripe') => {
  if (!features.payment.enabled) return false
  return provider === 'toss' ? features.payment.tossPayments : features.payment.stripe
}