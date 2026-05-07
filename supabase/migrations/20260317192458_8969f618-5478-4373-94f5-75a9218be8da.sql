
-- Allow anon users to upload DISC files (from public form)
CREATE POLICY "Anon can upload disc files"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'disc-files');

-- Allow anon to insert into candidate_disc (from public form)
CREATE POLICY "Anon can insert disc"
ON public.candidate_disc FOR INSERT
TO anon
WITH CHECK (true);
