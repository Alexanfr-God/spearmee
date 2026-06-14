ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS boost_until timestamptz,
  ADD COLUMN IF NOT EXISTS reveal_likers_until timestamptz,
  ADD COLUMN IF NOT EXISTS earn_multiplier numeric,
  ADD COLUMN IF NOT EXISTS earn_multiplier_until timestamptz;