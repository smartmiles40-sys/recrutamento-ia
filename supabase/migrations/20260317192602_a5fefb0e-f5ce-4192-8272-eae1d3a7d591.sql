
-- Set default DISC test URL for all jobs
ALTER TABLE public.jobs ALTER COLUMN disc_test_url SET DEFAULT 'https://www.mrcoach.com.br/teste-perfil-comportamental-disc.php';

-- Update all existing jobs that don't have a DISC URL yet
UPDATE public.jobs SET disc_test_url = 'https://www.mrcoach.com.br/teste-perfil-comportamental-disc.php' WHERE disc_test_url IS NULL;
