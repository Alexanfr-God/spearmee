-- Security hardening:
--  1) premium_intent_events: add owner-only SELECT policy (close the gap)
--  2) profiles: stop exposing sensitive columns to every signed-in user
--  3) photos table + storage bucket: restrict reads to owner or match members

-- ---------------------------------------------------------------------------
-- 1) premium_intent_events — owner can read only their own events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read their own intent events" ON public.premium_intent_events;
CREATE POLICY "Users can read their own intent events"
ON public.premium_intent_events
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) profiles — only the owner can read their full row.
--    Other users read a curated, non-sensitive subset via public_profiles.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON public.profiles;

DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
CREATE POLICY "Users can read their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Curated public view: excludes telegram_id, lat, lng, last_active, is_premium,
-- birth_date, weight_kg and other sensitive/internal fields.
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT
  id,
  display_name,
  username,
  bio,
  gender,
  city,
  country,
  height_cm,
  looking_for,
  relationship_goal,
  native_languages,
  religion,
  education,
  drinking,
  smoking,
  exercise,
  diet,
  body_type,
  hair_type,
  hair_color,
  eye_color,
  ethnicity,
  wants_children,
  children_timeline,
  wants_marriage,
  has_children,
  willing_to_relocate,
  prompt_answer,
  verified
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO authenticated;

-- ---------------------------------------------------------------------------
-- 3a) photos metadata table — owner or match member only
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can read all photos" ON public.photos;
CREATE POLICY "Owner or match member can read photos"
ON public.photos
FOR SELECT
TO authenticated
USING (
  profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user_a = auth.uid() AND m.user_b = photos.profile_id)
       OR (m.user_b = auth.uid() AND m.user_a = photos.profile_id)
  )
);

-- ---------------------------------------------------------------------------
-- 3b) storage bucket "photos" — owner or match member only.
--    Discover candidate photos are signed server-side (service role), so this
--    no longer needs to be readable by every authenticated user.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view photos" ON storage.objects;
CREATE POLICY "Owner or match member can view photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.user_a = auth.uid() AND m.user_b::text = (storage.foldername(name))[1])
         OR (m.user_b = auth.uid() AND m.user_a::text = (storage.foldername(name))[1])
    )
  )
);
