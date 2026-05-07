
ALTER TABLE public.jobs
ADD COLUMN intro_title text DEFAULT 'Sobre a Vaga',
ADD COLUMN intro_message text DEFAULT 'Leia com atenção as informações abaixo antes de iniciar sua candidatura.';
