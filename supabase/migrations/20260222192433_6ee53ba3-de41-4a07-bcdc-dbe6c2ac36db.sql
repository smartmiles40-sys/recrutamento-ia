-- Create storage bucket for CVs
INSERT INTO storage.buckets (id, name, public) VALUES ('cvs', 'cvs', false);

-- Allow anyone to upload CVs (public form, no auth)
CREATE POLICY "Anyone can upload CVs" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'cvs');

-- Allow reading CVs (for the edge function / internal use)
CREATE POLICY "Anyone can read CVs" ON storage.objects
FOR SELECT USING (bucket_id = 'cvs');
