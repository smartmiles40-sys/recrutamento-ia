-- =============================================
-- BANCO DE TALENTOS
--
-- Uma vaga "guarda-chuva": o candidato escolhe a area de interesse e escreve
-- o cargo desejado, e o formulario mostra apenas os blocos daquela area.
--
-- As areas e as perguntas de cada area vivem NO BANCO (nada hardcoded no
-- front), entao dar para editar tudo pela tela de Configuracoes sem deploy.
-- =============================================

-- ---------------------------------------------
-- 1. Areas (antes era uma lista fixa no codigo)
-- ---------------------------------------------
CREATE TABLE public.areas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- O formulario publico precisa listar as areas ofertadas para um candidato
-- anonimo, entao a leitura e aberta. Nome de area nao e dado sensivel.
CREATE POLICY "Anyone can view areas"
  ON public.areas FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage areas"
  ON public.areas FOR ALL
  USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.areas (name, sort_order) VALUES
  ('Comercial', 1),
  ('Operações', 2),
  ('Relacionamento', 3),
  ('Marketing', 4),
  ('Tecnologia', 5),
  ('Financeiro', 6);

-- ---------------------------------------------
-- 2. Vaga pode ser um banco de talentos
-- ---------------------------------------------
ALTER TABLE public.jobs
  ADD COLUMN is_talent_pool boolean NOT NULL DEFAULT false,
  -- Areas que o candidato pode escolher. Vazio = todas as areas ativas.
  ADD COLUMN talent_pool_areas text[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------
-- 3. Bloco pode ser exclusivo de uma area
--    NULL = vale para todo mundo (dados basicos, curriculo, fit cultural)
-- ---------------------------------------------
ALTER TABLE public.block_templates
  ADD COLUMN area text REFERENCES public.areas(name) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE public.job_stages
  ADD COLUMN area text REFERENCES public.areas(name) ON UPDATE CASCADE ON DELETE SET NULL;

-- O formulario publico filtra as etapas pela area escolhida pelo candidato.
CREATE INDEX idx_job_stages_job_area ON public.job_stages (job_id, area);

-- ---------------------------------------------
-- 4. O que o candidato declarou querer
-- ---------------------------------------------
ALTER TABLE public.candidates
  ADD COLUMN desired_area text,
  ADD COLUMN desired_role text;

-- ---------------------------------------------
-- 5. O bloco comercial que ja existia passa a ser da area Comercial
-- ---------------------------------------------
UPDATE public.block_templates
SET area = 'Comercial'
WHERE id = 'd0000000-0000-0000-0000-000000000004';

-- ---------------------------------------------
-- 6. Blocos por area
--    Perguntas iniciais para o time editar/ajustar em Configuracoes.
-- ---------------------------------------------

-- Operacoes
INSERT INTO public.block_templates (id, name, description, stage_key, area, suggested_weight, is_eliminatory, is_active) VALUES
  ('a1000000-0000-0000-0000-000000000011', 'Área — Operações', 'Perguntas específicas de operações (processos, rotina, organização)', 'technical', 'Operações', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('a1000000-0000-0000-0000-000000000011', 'Descreva um processo operacional que você organizou do zero ou melhorou. Qual era o problema e qual foi o resultado?', 'textarea', true, 1),
  ('a1000000-0000-0000-0000-000000000011', 'Como você controla prazos e pendências quando está tocando várias demandas ao mesmo tempo?', 'textarea', true, 2),
  ('a1000000-0000-0000-0000-000000000011', 'Quais ferramentas de gestão/operação você já usou (ex: ClickUp, Trello, Notion, planilhas, ERP)?', 'textarea', true, 3),
  ('a1000000-0000-0000-0000-000000000011', 'Conte sobre um erro operacional que aconteceu sob sua responsabilidade. O que você fez?', 'textarea', true, 4);

-- Relacionamento
INSERT INTO public.block_templates (id, name, description, stage_key, area, suggested_weight, is_eliminatory, is_active) VALUES
  ('a2000000-0000-0000-0000-000000000012', 'Área — Relacionamento', 'Perguntas específicas de relacionamento e atendimento ao cliente', 'technical', 'Relacionamento', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('a2000000-0000-0000-0000-000000000012', 'Conte sobre um cliente insatisfeito que você conseguiu reverter. O que você fez?', 'textarea', true, 1),
  ('a2000000-0000-0000-0000-000000000012', 'Quais canais de atendimento você já usou profissionalmente (WhatsApp, telefone, e-mail, presencial)?', 'textarea', true, 2),
  ('a2000000-0000-0000-0000-000000000012', 'Como você lida com um cliente que está com a razão, mas a política da empresa não permite atendê-lo?', 'textarea', true, 3),
  ('a2000000-0000-0000-0000-000000000012', 'Quantos clientes/atendimentos você costumava tocar por dia?', 'text', true, 4);

-- Tecnologia
INSERT INTO public.block_templates (id, name, description, stage_key, area, suggested_weight, is_eliminatory, is_active) VALUES
  ('a3000000-0000-0000-0000-000000000013', 'Área — Tecnologia', 'Perguntas específicas de tecnologia (stack, projetos, resolução de problemas)', 'technical', 'Tecnologia', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('a3000000-0000-0000-0000-000000000013', 'Quais tecnologias, linguagens e ferramentas você domina? Indique seu nível em cada uma.', 'textarea', true, 1),
  ('a3000000-0000-0000-0000-000000000013', 'Descreva um projeto que você construiu ou do qual participou. Qual era seu papel e o que foi entregue?', 'textarea', true, 2),
  ('a3000000-0000-0000-0000-000000000013', 'Link do seu GitHub, portfólio ou algo que você tenha construído', 'url', false, 3),
  ('a3000000-0000-0000-0000-000000000013', 'Conte sobre um problema técnico difícil que você resolveu. Como chegou na solução?', 'textarea', true, 4);

-- Marketing
INSERT INTO public.block_templates (id, name, description, stage_key, area, suggested_weight, is_eliminatory, is_active) VALUES
  ('a4000000-0000-0000-0000-000000000014', 'Área — Marketing', 'Perguntas específicas de marketing (campanhas, métricas, conteúdo)', 'technical', 'Marketing', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('a4000000-0000-0000-0000-000000000014', 'Descreva uma campanha que você tocou do início ao fim. Qual era o objetivo e qual foi o resultado em números?', 'textarea', true, 1),
  ('a4000000-0000-0000-0000-000000000014', 'Quais métricas você acompanhava no dia a dia e o que fazia quando elas caíam?', 'textarea', true, 2),
  ('a4000000-0000-0000-0000-000000000014', 'Com quais ferramentas você já trabalhou (Meta Ads, Google Ads, GA4, RD, CRM, edição, design)?', 'textarea', true, 3),
  ('a4000000-0000-0000-0000-000000000014', 'Link de portfólio, campanha ou conteúdo que você produziu', 'url', false, 4);

-- Financeiro
INSERT INTO public.block_templates (id, name, description, stage_key, area, suggested_weight, is_eliminatory, is_active) VALUES
  ('a5000000-0000-0000-0000-000000000015', 'Área — Financeiro', 'Perguntas específicas de financeiro (rotinas, conciliação, controle)', 'technical', 'Financeiro', 25, false, true);

INSERT INTO public.block_template_questions (block_template_id, question_text, field_type, is_required, question_order) VALUES
  ('a5000000-0000-0000-0000-000000000015', 'Quais rotinas financeiras você já executou (contas a pagar/receber, conciliação, fluxo de caixa, fechamento)?', 'textarea', true, 1),
  ('a5000000-0000-0000-0000-000000000015', 'Quais sistemas financeiros/ERPs você já usou?', 'textarea', true, 2),
  ('a5000000-0000-0000-0000-000000000015', 'Conte sobre uma divergência ou erro de valor que você identificou. Como resolveu?', 'textarea', true, 3),
  ('a5000000-0000-0000-0000-000000000015', 'Qual seu nível de Excel/Planilhas? Dê um exemplo do que você já construiu.', 'textarea', true, 4);
