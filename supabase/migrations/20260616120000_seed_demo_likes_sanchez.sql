-- Demo seed: make every onboarded female demo profile (that has a photo) like
-- the "Sanchez" demo account, and have Sanchez like them back, so the existing
-- handle_swipe_match trigger auto-creates a match for each. This gives Sanchez
-- ready chats to test the conversation UI + AI-baby generation.
--
-- Idempotent (ON CONFLICT DO NOTHING) and null-safe: if no "Sanchez" profile
-- exists in this environment it does nothing. Only touches the named account.
DO $$
DECLARE
  sanchez_id uuid;
BEGIN
  SELECT id INTO sanchez_id
  FROM public.profiles
  WHERE display_name = 'Sanchez' OR username = 'Sanchez'
  ORDER BY created_at
  LIMIT 1;

  IF sanchez_id IS NULL THEN
    RAISE NOTICE 'No Sanchez profile found; skipping demo like seed.';
    RETURN;
  END IF;

  -- 1) Each demo girl (onboarded, has at least one photo) likes Sanchez.
  INSERT INTO public.swipes (swiper_id, target_id, action)
  SELECT p.id, sanchez_id, 'like'
  FROM public.profiles p
  WHERE p.id <> sanchez_id
    AND p.gender = 'female'
    AND p.onboarded = true
    AND EXISTS (SELECT 1 FROM public.photos ph WHERE ph.profile_id = p.id)
  ON CONFLICT (swiper_id, target_id) DO NOTHING;

  -- 2) Sanchez likes them back; the AFTER INSERT trigger handle_swipe_match
  --    sees the reciprocal like and creates the match row for each pair.
  INSERT INTO public.swipes (swiper_id, target_id, action)
  SELECT sanchez_id, p.id, 'like'
  FROM public.profiles p
  WHERE p.id <> sanchez_id
    AND p.gender = 'female'
    AND p.onboarded = true
    AND EXISTS (SELECT 1 FROM public.photos ph WHERE ph.profile_id = p.id)
  ON CONFLICT (swiper_id, target_id) DO NOTHING;
END $$;
