
-- Add evaluation_criteria and reference_material to block_templates
ALTER TABLE public.block_templates 
ADD COLUMN evaluation_criteria text,
ADD COLUMN reference_material text;

-- Add evaluation_criteria and reference_material to job_stages
ALTER TABLE public.job_stages 
ADD COLUMN evaluation_criteria text,
ADD COLUMN reference_material text;
