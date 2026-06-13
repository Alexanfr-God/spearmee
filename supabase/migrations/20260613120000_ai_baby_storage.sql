-- Real AI-baby: private storage bucket for generated previews + member-scoped read
-- + result lifecycle status. Images are delivered via short-lived signed URLs
-- (service-role signed), so this SELECT policy is defense-in-depth.

-- Private bucket for generated baby preview images.
INSERT INTO storage.buckets (id, name, public)
VALUES ('baby', 'baby', false)
ON CONFLICT (id) DO NOTHING;

-- Match members can read baby images. Path convention: "{match_id}/{file}".
CREATE POLICY "Match members can read baby images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'baby'
    AND public.is_match_member(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- Track generation lifecycle (synchronous today; future-proofing for async).
ALTER TABLE public.ai_baby_results
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready';
