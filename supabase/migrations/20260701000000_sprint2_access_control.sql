-- ============================================================================
-- Sprint 2 — Controle de acesso (LGPD)
--
-- PROBLEMA: qualquer usuário AUTENTICADO conseguia ler todos os dados pessoais
-- dos candidatos, porque as policies de SELECT eram `USING (true)`. Combinado
-- com (a) cadastro público aberto e (b) o trigger handle_new_user, que dava a
-- role 'recruiter' a QUALQUER novo cadastro, qualquer pessoa podia se registrar
-- e ver nome, e-mail, telefone, currículo e DISC de todos os candidatos.
--
-- CORREÇÃO:
--   1. SELECT em candidates / responses / evaluations / disc passa a exigir um
--      papel de equipe (admin, recruiter ou reader).
--   2. handle_new_user só dá 'admin' ao PRIMEIRO usuário (bootstrap). Os demais
--      ficam SEM papel — e portanto sem acesso — até um admin liberar via a
--      função create-user.
--
-- Usuários e papéis já existentes NÃO são alterados (sem risco de lockout).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Leitura de dados de candidato exige papel de equipe
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated can view candidates" ON public.candidates;
CREATE POLICY "Staff can view candidates"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'reader')
  );

DROP POLICY IF EXISTS "Authenticated can view responses" ON public.candidate_responses;
CREATE POLICY "Staff can view responses"
  ON public.candidate_responses FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'reader')
  );

DROP POLICY IF EXISTS "Authenticated can view evaluations" ON public.candidate_evaluations;
CREATE POLICY "Staff can view evaluations"
  ON public.candidate_evaluations FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'reader')
  );

DROP POLICY IF EXISTS "Authenticated can view disc" ON public.candidate_disc;
CREATE POLICY "Staff can view disc"
  ON public.candidate_disc FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'recruiter')
    OR public.has_role(auth.uid(), 'reader')
  );

-- ----------------------------------------------------------------------------
-- 2. Novos cadastros não recebem mais papel automático
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));

  -- Bootstrap: o PRIMEIRO usuário do sistema vira admin. Todos os demais ficam
  -- sem papel (sem acesso) até um admin atribuir um via a função create-user.
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
