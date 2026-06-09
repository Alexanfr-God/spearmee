-- 1) New profile columns for richer onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_kg integer,
  ADD COLUMN IF NOT EXISTS eye_color text,
  ADD COLUMN IF NOT EXISTS hair_color text,
  ADD COLUMN IF NOT EXISTS hair_type text,
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS ethnicity text,
  ADD COLUMN IF NOT EXISTS children_timeline text,
  ADD COLUMN IF NOT EXISTS has_children text,
  ADD COLUMN IF NOT EXISTS diet text,
  ADD COLUMN IF NOT EXISTS exercise text,
  ADD COLUMN IF NOT EXISTS wants_marriage text,
  ADD COLUMN IF NOT EXISTS willing_to_relocate text,
  ADD COLUMN IF NOT EXISTS native_languages text[],
  ADD COLUMN IF NOT EXISTS prompt_answer text;

-- 2) Messages: store the original language of the message body
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS original_lang text;

-- 3) Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4) Partner preferences (one row per profile)
CREATE TABLE IF NOT EXISTS public.preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  age_min integer,
  age_max integer,
  distance_km integer,
  height_min integer,
  height_max integer,
  wants_children text[],
  children_timeline text[],
  relationship_goal text[],
  smoking text[],
  drinking text[],
  religion text[],
  education text[],
  eye_color text[],
  hair_color text[],
  ethnicity text[],
  willing_to_relocate text,
  dealbreakers text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.preferences TO authenticated;
GRANT ALL ON public.preferences TO service_role;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.preferences FOR ALL TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE TRIGGER update_preferences_updated_at
  BEFORE UPDATE ON public.preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Daily curated resonance sets
CREATE TABLE IF NOT EXISTS public.daily_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  set_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  candidate_ids uuid[] NOT NULL DEFAULT '{}',
  seen_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, set_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_sets TO authenticated;
GRANT ALL ON public.daily_sets TO service_role;
ALTER TABLE public.daily_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily sets"
  ON public.daily_sets FOR ALL TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE TRIGGER update_daily_sets_updated_at
  BEFORE UPDATE ON public.daily_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) Cached message translations
CREATE TABLE IF NOT EXISTS public.message_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  lang text NOT NULL,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, lang)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_translations TO authenticated;
GRANT ALL ON public.message_translations TO service_role;
ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;

-- Match members can read translations for messages in their match
CREATE POLICY "Match members read translations"
  ON public.message_translations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_translations.message_id
        AND public.is_match_member(m.match_id, auth.uid())
    )
  );

-- Match members can insert translations for messages in their match
CREATE POLICY "Match members write translations"
  ON public.message_translations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_translations.message_id
        AND public.is_match_member(m.match_id, auth.uid())
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_translations;