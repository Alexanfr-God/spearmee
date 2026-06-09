CREATE POLICY "Authenticated can view photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos');

CREATE POLICY "Users can upload their own photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);