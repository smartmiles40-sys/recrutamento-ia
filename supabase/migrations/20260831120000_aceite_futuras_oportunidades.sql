-- =============================================
-- ACEITE OPCIONAL: FUTURAS OPORTUNIDADES
--
-- O topo do formulario passou a ter dois aceites:
--   1. obrigatorio  -> uso dos dados neste processo seletivo (lgpd_consent)
--   2. opcional     -> guardar os dados para futuras oportunidades (esta coluna)
--
-- Enquanto esta migration nao for aplicada, o formulario continua funcionando:
-- ele repete o insert sem este campo. Depois de aplicar, o aceite passa a ser
-- gravado.
-- =============================================

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS future_opportunities_consent boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.candidates.future_opportunities_consent IS
  'Aceite opcional: a pessoa autorizou guardar os dados para futuras oportunidades.';
