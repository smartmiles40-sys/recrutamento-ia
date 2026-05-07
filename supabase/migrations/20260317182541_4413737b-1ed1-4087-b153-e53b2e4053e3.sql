
CREATE OR REPLACE FUNCTION public.calculate_candidate_score(p_candidate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_weighted_score NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_final_score NUMERIC;
  v_classification TEXT;
  v_culture_score NUMERIC;
  v_min_culture INTEGER;
  v_culture_rejection BOOLEAN;
  v_min_stage_score NUMERIC;
  v_result JSONB;
BEGIN
  -- Calculate weighted score from evaluations
  SELECT 
    COALESCE(SUM(ce.score * js.weight), 0),
    COALESCE(SUM(js.weight), 0)
  INTO v_total_weighted_score, v_total_weight
  FROM public.candidate_evaluations ce
  JOIN public.job_stages js ON js.id = ce.stage_id
  WHERE ce.candidate_id = p_candidate_id
  AND js.is_enabled = true
  AND ce.score IS NOT NULL;

  IF v_total_weight > 0 THEN
    v_final_score := v_total_weighted_score / v_total_weight;
  ELSE
    v_final_score := NULL;
  END IF;

  -- Get the minimum individual stage score for this candidate
  SELECT MIN(ce.score)
  INTO v_min_stage_score
  FROM public.candidate_evaluations ce
  JOIN public.job_stages js ON js.id = ce.stage_id
  WHERE ce.candidate_id = p_candidate_id
  AND js.is_enabled = true
  AND ce.score IS NOT NULL;

  -- Determine classification
  -- "Forte" requires final >= 80 AND all individual stages >= 75
  IF v_final_score IS NULL THEN
    v_classification := NULL;
  ELSIF v_final_score >= 80 AND v_min_stage_score >= 75 THEN
    v_classification := 'Forte';
  ELSIF v_final_score >= 70 THEN
    v_classification := 'Desenvolvível';
  ELSE
    v_classification := 'Risco';
  END IF;

  -- Check culture rejection
  SELECT ce.score INTO v_culture_score
  FROM public.candidate_evaluations ce
  JOIN public.job_stages js ON js.id = ce.stage_id
  WHERE ce.candidate_id = p_candidate_id AND js.stage_key = 'culture';

  SELECT j.min_culture_score, j.culture_rejection_enabled
  INTO v_min_culture, v_culture_rejection
  FROM public.candidates c
  JOIN public.jobs j ON j.id = c.job_id
  WHERE c.id = p_candidate_id;

  v_result := jsonb_build_object(
    'final_score', v_final_score,
    'classification', v_classification,
    'culture_rejected', (v_culture_rejection AND v_culture_score IS NOT NULL AND v_culture_score < v_min_culture)
  );

  -- Update candidate
  UPDATE public.candidates
  SET final_score = v_final_score, classification = v_classification
  WHERE id = p_candidate_id;

  RETURN v_result;
END;
$$;
