-- Stripe integration columns

-- teacher_areas: store Stripe product and price IDs
ALTER TABLE public.teacher_areas
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- profiles: store Stripe customer ID
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- teacher_subscriptions: store Stripe subscription details and failure tracking
ALTER TABLE public.teacher_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0;

-- Index on stripe IDs for quick lookups
CREATE INDEX IF NOT EXISTS idx_teacher_areas_stripe_product ON public.teacher_areas(stripe_product_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subs_stripe_sub ON public.teacher_subscriptions(stripe_subscription_id);
