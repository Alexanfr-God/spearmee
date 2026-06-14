-- Reveal "who liked you" (H2): a paid-with-RP window during which a user can
-- see the profiles of people who liked them.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reveal_likers_until timestamptz;
