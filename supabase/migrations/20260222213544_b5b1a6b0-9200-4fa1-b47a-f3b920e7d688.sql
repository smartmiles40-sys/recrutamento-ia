
-- =============================================
-- BLOCK TEMPLATES (Global Library)
-- =============================================
CREATE TABLE public.block_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  stage_key text NOT NULL,
  suggested_weight integer DEFAULT 0,
  is_eliminatory boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.block_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view block templates"
  ON public.block_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage block templates"
  ON public.block_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_block_templates_updated_at
  BEFORE UPDATE ON public.block_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- BLOCK TEMPLATE QUESTIONS
-- =============================================
CREATE TABLE public.block_template_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_template_id uuid NOT NULL REFERENCES public.block_templates(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb,
  is_required boolean DEFAULT true,
  question_order integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.block_template_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view block template questions"
  ON public.block_template_questions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage block template questions"
  ON public.block_template_questions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- =============================================
-- ADD source_block_id to job_stages for tracking origin
-- =============================================
ALTER TABLE public.job_stages ADD COLUMN source_block_id uuid REFERENCES public.block_templates(id) ON DELETE SET NULL;

-- =============================================
-- SEED: Block A — Dados Básicos
-- =============================================
INSERT INTO public.block_templates (id, name, description, stage_key, suggested_weight, is_eliminatory, is_active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Bloco A — Dados Básicos', 'Informações pessoais e contato do candidato', 'application', 0, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Nome completo', 'text', true, 1),
  ('a0000000-0000-0000-0000-000000000001', 'E-mail', 'text', true, 2),
  ('a0000000-0000-0000-0000-000000000001', 'Telefone', 'text', true, 3),
  ('a0000000-0000-0000-0000-000000000001', 'Cidade/UF', 'text', true, 4),
  ('a0000000-0000-0000-0000-000000000001', 'LinkedIn', 'url', false, 5);

-- =============================================
-- SEED: Block B — Currículo
-- =============================================
INSERT INTO public.block_templates (id, name, description, stage_key, suggested_weight, is_eliminatory, is_active) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Bloco B — Currículo', 'Upload de currículo do candidato', 'cv_upload', 0, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'Upload currículo (PDF/DOC/DOCX)', 'upload', true, 1);

-- =============================================
-- SEED: Block C — Experiência e Ferramentas
-- =============================================
INSERT INTO public.block_templates (id, name, description, stage_key, suggested_weight, is_eliminatory, is_active) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'Bloco C — Experiência e Ferramentas', 'Experiência profissional genérica, ferramentas e disponibilidade', 'technical', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('c0000000-0000-0000-0000-000000000003', 'Descreva sua experiência profissional relevante para esta vaga.', 'textarea', true, 1),
  ('c0000000-0000-0000-0000-000000000003', 'Quais ferramentas e softwares você domina?', 'textarea', true, 2),
  ('c0000000-0000-0000-0000-000000000003', 'Quais canais de atendimento você já utilizou profissionalmente?', 'textarea', true, 3),
  ('c0000000-0000-0000-0000-000000000003', 'Você tem disponibilidade para trabalho 100% presencial?', 'select', true, 4),
  ('c0000000-0000-0000-0000-000000000003', 'Qual sua pretensão salarial?', 'text', true, 5);

-- Set options for the select question
UPDATE public.block_template_questions 
SET options = '["Sim", "Não"]'::jsonb
WHERE block_template_id = 'c0000000-0000-0000-0000-000000000003' AND field_type = 'select';

-- =============================================
-- SEED: Block D — Performance Comercial
-- =============================================
INSERT INTO public.block_templates (id, name, description, stage_key, suggested_weight, is_eliminatory, is_active) VALUES
  ('d0000000-0000-0000-0000-000000000004', 'Bloco D — Performance Comercial', 'Métricas de vendas, metas e vídeo de apresentação (opcional)', 'commercial', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('d0000000-0000-0000-0000-000000000004', 'Qual foi sua maior meta mensal atingida? Descreva números.', 'textarea', true, 1),
  ('d0000000-0000-0000-0000-000000000004', 'Qual sua taxa de conversão média?', 'text', true, 2),
  ('d0000000-0000-0000-0000-000000000004', 'Qual o volume de ligações/contatos que você fazia por dia?', 'text', true, 3),
  ('d0000000-0000-0000-0000-000000000004', 'Descreva seu histórico de resultados nos últimos 6 meses.', 'textarea', true, 4),
  ('d0000000-0000-0000-0000-000000000004', 'Vídeo de apresentação (máx 2 min)', 'upload', true, 5);

-- =============================================
-- SEED: Block E — Caso Prático
-- =============================================
INSERT INTO public.block_templates (id, name, description, stage_key, suggested_weight, is_eliminatory, is_active) VALUES
  ('e0000000-0000-0000-0000-000000000005', 'Bloco E — Caso Prático', 'Upload de caso prático com instruções configuráveis por vaga', 'practical_case', 20, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('e0000000-0000-0000-0000-000000000005', 'Upload do caso prático (arquivo)', 'upload', true, 1),
  ('e0000000-0000-0000-0000-000000000005', 'Instruções do caso prático', 'textarea', false, 2);

-- =============================================
-- SEED: Block F — Fit Cultural (STFEV)
-- =============================================
INSERT INTO public.block_templates (id, name, description, stage_key, suggested_weight, is_eliminatory, is_active) VALUES
  ('f0000000-0000-0000-0000-000000000006', 'Bloco F — Fit Cultural (STFEV)', 'Perguntas de fit cultural Se Tu For Eu Vou', 'culture', 25, true, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('f0000000-0000-0000-0000-000000000006', 'O que significa "pensamento de dono" para você? Dê um exemplo real.', 'textarea', true, 1),
  ('f0000000-0000-0000-0000-000000000006', 'Como você reage quando comete um erro no trabalho?', 'textarea', true, 2),
  ('f0000000-0000-0000-0000-000000000006', 'Como você lida com prazos apertados?', 'textarea', true, 3),
  ('f0000000-0000-0000-0000-000000000006', 'Como você reage sob cobrança intensa?', 'textarea', true, 4),
  ('f0000000-0000-0000-0000-000000000006', 'Como você resolve conflitos com colegas de trabalho?', 'textarea', true, 5),
  ('f0000000-0000-0000-0000-000000000006', 'Como você prioriza suas tarefas quando tudo é urgente?', 'textarea', true, 6),
  ('f0000000-0000-0000-0000-000000000006', 'Qual foi uma situação em que você precisou ser transparente mesmo sendo desconfortável?', 'textarea', true, 7),
  ('f0000000-0000-0000-0000-000000000006', 'O que você considera "resultado" no seu trabalho? Como mede?', 'textarea', true, 8),
  ('f0000000-0000-0000-0000-000000000006', 'O que te faz perder a confiança em uma liderança/empresa?', 'textarea', true, 9),
  ('f0000000-0000-0000-0000-000000000006', 'Por que você quer trabalhar aqui? (não responder genérico)', 'textarea', true, 10),
  ('f0000000-0000-0000-0000-000000000006', 'Onde você quer estar em 2–3 anos?', 'textarea', true, 11),
  ('f0000000-0000-0000-0000-000000000006', 'Cite uma atitude sua que demonstra maturidade e responsabilidade profissional.', 'textarea', true, 12);
