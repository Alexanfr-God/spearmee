-- Points economy (H): earn multiplier + optional social handles (soft signals).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS earn_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS earn_multiplier_until timestamptz,
  ADD COLUMN IF NOT EXISTS social_x text,
  ADD COLUMN IF NOT EXISTS social_instagram text;
