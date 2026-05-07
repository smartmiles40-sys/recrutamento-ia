
-- 1. Add DISC stage to all existing jobs that don't have one
INSERT INTO public.job_stages (job_id, stage_key, label, stage_order, weight, is_enabled)
SELECT j.id, 'disc', 'Teste DISC', 6, 5, true
FROM public.jobs j
WHERE NOT EXISTS (
  SELECT 1 FROM public.job_stages js WHERE js.job_id = j.id AND js.stage_key = 'disc'
);

-- 2. Create trigger function to auto-create default stages for new jobs
CREATE OR REPLACE FUNCTION public.create_default_stages_for_job()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.job_stages (job_id, stage_key, label, stage_order, weight, is_enabled)
  VALUES
    (NEW.id, 'application', 'Etapa 1 - Dados Básicos', 1, 15, true),
    (NEW.id, 'cv_upload', 'Etapa 2 - Currículo', 2, 0, true),
    (NEW.id, 'technical', 'Etapa 3 - Técnico', 3, 25, false),
    (NEW.id, 'commercial', 'Etapa 4 - Performance Comercial', 4, 25, false),
    (NEW.id, 'culture', 'Etapa 5 - Fit Cultural', 5, 25, false),
    (NEW.id, 'disc', 'Teste DISC', 6, 5, true),
    (NEW.id, 'online_interview', 'Entrevista Online', 7, 15, false),
    (NEW.id, 'in_person', 'Entrevista Presencial', 8, 15, false);
  RETURN NEW;
END;
$$;

-- 3. Create the trigger
CREATE TRIGGER trigger_create_default_stages
  AFTER INSERT ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_stages_for_job();
