-- Resonance Points + verification + streaks

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS streak_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date date;

CREATE TABLE IF NOT EXISTS public.points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  points integer NOT NULL,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_ledger_profile_idx ON public.points_ledger(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS points_ledger_dedupe_idx
  ON public.points_ledger(profile_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

GRANT SELECT ON public.points_ledger TO authenticated;
GRANT ALL ON public.points_ledger TO service_role;

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
  ON public.points_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);