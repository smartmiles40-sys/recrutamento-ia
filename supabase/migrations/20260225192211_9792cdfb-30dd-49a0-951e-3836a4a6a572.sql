
-- Drop restrictive anon insert policy and recreate as permissive
DROP POLICY IF EXISTS "Anon can insert candidates" ON public.candidates;
CREATE POLICY "Anon can insert candidates"
  ON public.candidates
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Same for candidate_responses
DROP POLICY IF EXISTS "Anon can insert responses" ON public.candidate_responses;
CREATE POLICY "Anon can insert responses"
  ON public.candidate_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);
