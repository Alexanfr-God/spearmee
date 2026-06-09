-- =========================================================
-- PROFILES (profiles.id == auth.users.id)
-- =========================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  telegram_id bigint UNIQUE NOT NULL,
  username text,
  display_name text,
  birth_date date,
  gender text,
  looking_for text,
  bio text,
  height_cm int,
  education text,
  smoking text,
  drinking text,
  religion text,
  wants_children text,
  relationship_goal text,
  city text,
  country text,
  lat double precision,
  lng double precision,
  language_code text DEFAULT 'en',
  is_premium boolean DEFAULT false,
  onboarded boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- PHOTOS
-- =========================================================
CREATE TABLE public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.photos TO authenticated;
GRANT ALL ON public.photos TO service_role;

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read all photos"
  ON public.photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own photos"
  ON public.photos FOR INSERT TO authenticated WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can update their own photos"
  ON public.photos FOR UPDATE TO authenticated USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Users can delete their own photos"
  ON public.photos FOR DELETE TO authenticated USING (profile_id = auth.uid());

-- =========================================================
-- SWIPES
-- =========================================================
CREATE TABLE public.swipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  target_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (swiper_id, target_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.swipes TO authenticated;
GRANT ALL ON public.swipes TO service_role;

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own swipes"
  ON public.swipes FOR SELECT TO authenticated USING (swiper_id = auth.uid());
CREATE POLICY "Users can insert their own swipes"
  ON public.swipes FOR INSERT TO authenticated WITH CHECK (swiper_id = auth.uid());

-- =========================================================
-- MATCHES
-- =========================================================
CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user_b uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_a, user_b)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own matches"
  ON public.matches FOR SELECT TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- =========================================================
-- MESSAGES
-- =========================================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_match_member(_match_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = _match_id AND (m.user_a = _user_id OR m.user_b = _user_id)
  )
$$;

CREATE POLICY "Members can read match messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_match_member(match_id, auth.uid()));
CREATE POLICY "Members can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_match_member(match_id, auth.uid()));
CREATE POLICY "Members can update read state"
  ON public.messages FOR UPDATE TO authenticated
  USING (public.is_match_member(match_id, auth.uid()));

-- =========================================================
-- AI BABY RESULTS
-- =========================================================
CREATE TABLE public.ai_baby_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
  requested_by uuid REFERENCES public.profiles(id),
  image_url text,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_baby_results TO authenticated;
GRANT ALL ON public.ai_baby_results TO service_role;

ALTER TABLE public.ai_baby_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read ai baby results"
  ON public.ai_baby_results FOR SELECT TO authenticated
  USING (public.is_match_member(match_id, auth.uid()));

-- =========================================================
-- ARTICLES (public read)
-- =========================================================
CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  cover_image text,
  body_markdown text,
  lang text DEFAULT 'en',
  published_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.articles TO anon, authenticated;
GRANT ALL ON public.articles TO service_role;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read articles"
  ON public.articles FOR SELECT TO anon, authenticated USING (true);

-- =========================================================
-- PREMIUM INTENT EVENTS
-- =========================================================
CREATE TABLE public.premium_intent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  context jsonb,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_intent_events TO authenticated;
GRANT ALL ON public.premium_intent_events TO service_role;

ALTER TABLE public.premium_intent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own intent events"
  ON public.premium_intent_events FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- =========================================================
-- AUTO-MATCH TRIGGER
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_swipe_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reciprocal boolean;
  a uuid;
  b uuid;
BEGIN
  IF NEW.action NOT IN ('like','superlike') THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.swipes s
    WHERE s.swiper_id = NEW.target_id
      AND s.target_id = NEW.swiper_id
      AND s.action IN ('like','superlike')
  ) INTO reciprocal;

  IF reciprocal THEN
    IF NEW.swiper_id < NEW.target_id THEN
      a := NEW.swiper_id; b := NEW.target_id;
    ELSE
      a := NEW.target_id; b := NEW.swiper_id;
    END IF;

    INSERT INTO public.matches (user_a, user_b)
    VALUES (a, b)
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_swipe_match
  AFTER INSERT ON public.swipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_swipe_match();

-- =========================================================
-- REALTIME
-- =========================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;