-- Perks (G v2): a temporary boost lifts a profile in others' Resonance sets.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS boost_until timestamptz;
