
-- Add DISC test URL field to jobs table
ALTER TABLE public.jobs ADD COLUMN disc_test_url text;

-- Create storage bucket for DISC files
INSERT INTO storage.buckets (id, name, public) VALUES ('disc-files', 'disc-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for disc-files bucket
CREATE POLICY "Authenticated can upload disc files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'disc-files');

CREATE POLICY "Authenticated can view disc files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'disc-files');

CREATE POLICY "Authenticated can update disc files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'disc-files');

CREATE POLICY "Authenticated can delete disc files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'disc-files');
