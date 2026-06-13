-- Remove the SECURITY DEFINER view flagged by the linter
DROP VIEW IF EXISTS public.public_profiles;

-- Allow matched members to read each other's profile (owner read already exists)
DROP POLICY IF EXISTS "Match members can read profiles" ON public.profiles;
CREATE POLICY "Match members can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE (m.user_a = auth.uid() AND m.user_b = profiles.id)
       OR (m.user_b = auth.uid() AND m.user_a = profiles.id)
  )
);