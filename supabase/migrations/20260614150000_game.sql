-- Spearmee Run (Epic I): weekly leaderboard of game scores.
CREATE TABLE IF NOT EXISTS public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  score integer NOT NULL,
  week_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS game_scores_week_idx ON public.game_scores(week_key, score DESC);
CREATE INDEX IF NOT EXISTS game_scores_profile_idx ON public.game_scores(profile_id);

GRANT SELECT, INSERT ON public.game_scores TO authenticated;
GRANT ALL ON public.game_scores TO service_role;

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own game scores"
  ON public.game_scores FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Authenticated read game scores"
  ON public.game_scores FOR SELECT TO authenticated USING (true);
