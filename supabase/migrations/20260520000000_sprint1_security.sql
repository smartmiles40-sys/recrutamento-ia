-- ============================================================================
-- Sprint 1 — Security hardening
--
-- 1. Storage `cvs`: remove anon SELECT (LGPD risk — CVs were publicly readable).
-- 2. `public.candidates` UPDATE: scope by job owner (not "any recruiter").
-- 3. Rate-limit infrastructure for edge functions (DDoS / OpenAI cost abuse).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Storage policies for bucket `cvs`
-- ----------------------------------------------------------------------------
-- Anyone could SELECT (read) any CV. Restrict to authenticated users.
-- INSERT remains accessible to anon because the public application form is
-- unauthenticated; we tighten it by requiring a non-root folder path so anon
-- can't drop files at the bucket root.

DROP POLICY IF EXISTS "Anyone can read CVs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload CVs" ON storage.objects;

CREATE POLICY "Authenticated can read CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cvs');

CREATE POLICY "Anon can upload CVs into candidate folder"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (
    bucket_id = 'cvs'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND (storage.foldername(name))[1] <> ''
  );

CREATE POLICY "Authenticated can upload CVs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "Authenticated can delete CVs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cvs');

-- ----------------------------------------------------------------------------
-- 2. candidates UPDATE: scope to job owner (or admin)
-- ----------------------------------------------------------------------------
-- Previously: any recruiter or admin could UPDATE any candidate row,
-- regardless of which recruiter owned the job. This means recruiter A could
-- silently edit candidates that belong to recruiter B's hiring pipeline.
--
-- jobs.created_by already exists (migration 20260222204201_*) — we use it as
-- the canonical "owner" of a job.

DROP POLICY IF EXISTS "Admins and recruiters can update candidates" ON public.candidates;

CREATE POLICY "Admins or job owners can update candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = candidates.job_id
        AND j.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = candidates.job_id
        AND j.created_by = auth.uid()
    )
  );

-- Helpful index for the new policy (and for any "my candidates" query).
CREATE INDEX IF NOT EXISTS candidates_job_id_idx ON public.candidates (job_id);

-- ----------------------------------------------------------------------------
-- 3. Rate-limit table + atomic RPC for edge functions
-- ----------------------------------------------------------------------------
-- Fixed-window counter: each (function_name, client_key, window_start) holds
-- one row whose request_count is incremented atomically via UPSERT.
-- Service-role inserts; no other role has access (RLS enabled, no policies).

CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  function_name TEXT NOT NULL,
  client_key    TEXT NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (function_name, client_key, window_start)
);

CREATE INDEX IF NOT EXISTS edge_rate_limits_window_idx
  ON public.edge_rate_limits (window_start);

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;
-- (intentional: zero policies = only service_role bypasses RLS)

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_function_name TEXT,
  p_client_key    TEXT,
  p_window_seconds INTEGER,
  p_max_requests  INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now           TIMESTAMPTZ := now();
  v_epoch_window  BIGINT      := (extract(epoch FROM v_now)::BIGINT / p_window_seconds) * p_window_seconds;
  v_window_start  TIMESTAMPTZ := to_timestamp(v_epoch_window);
  v_count         INTEGER;
BEGIN
  INSERT INTO public.edge_rate_limits (function_name, client_key, window_start, request_count)
  VALUES (p_function_name, p_client_key, v_window_start, 1)
  ON CONFLICT (function_name, client_key, window_start)
  DO UPDATE SET request_count = public.edge_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT
    (v_count <= p_max_requests),
    v_count,
    v_window_start + make_interval(secs => p_window_seconds);
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;

-- Best-effort cleanup of old buckets. Safe to run periodically; idempotent.
CREATE OR REPLACE FUNCTION public.prune_edge_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.edge_rate_limits
  WHERE window_start < now() - INTERVAL '1 hour';
$$;

REVOKE ALL ON FUNCTION public.prune_edge_rate_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_edge_rate_limits() TO service_role;
