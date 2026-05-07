INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-uploads', 'candidate-uploads', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anon can upload candidate files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'candidate-uploads');

CREATE POLICY "Authenticated can upload candidate files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'candidate-uploads');

CREATE POLICY "Authenticated can view candidate files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'candidate-uploads');