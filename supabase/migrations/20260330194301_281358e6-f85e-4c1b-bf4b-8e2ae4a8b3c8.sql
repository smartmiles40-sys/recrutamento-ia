
CREATE TABLE public.candidate_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view notes" ON public.candidate_notes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and recruiters can insert notes" ON public.candidate_notes
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "Admins and recruiters can update notes" ON public.candidate_notes
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'recruiter'::app_role));

CREATE POLICY "Admins can delete notes" ON public.candidate_notes
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
