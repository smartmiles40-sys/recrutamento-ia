
-- ============================================
-- SISTEMA SE TU FOR, EU VOU - SCHEMA COMPLETO
-- ============================================

-- 1. ENUM DE ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'recruiter', 'reader');

-- 2. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. JOBS (VAGAS)
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('active', 'draft', 'closed', 'archived')),
  required_skills TEXT[] DEFAULT '{}',
  behavioral_profile TEXT,
  min_culture_score INTEGER DEFAULT 60,
  min_technical_score INTEGER DEFAULT 60,
  practical_case TEXT,
  culture_rejection_enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view active jobs" ON public.jobs FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "Admins and recruiters can insert jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Admins and recruiters can update jobs" ON public.jobs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Admins can delete jobs" ON public.jobs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. JOB STAGES (ETAPAS CONFIGURÁVEIS POR VAGA)
CREATE TABLE public.job_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  stage_key TEXT NOT NULL,
  label TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  weight INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  is_eliminatory BOOLEAN DEFAULT false,
  min_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view stages" ON public.job_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view stages of active jobs" ON public.job_stages FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND status = 'active')
);
CREATE POLICY "Admins and recruiters can manage stages" ON public.job_stages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));

-- 6. STAGE QUESTIONS (PERGUNTAS POR ETAPA)
CREATE TABLE public.stage_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id UUID REFERENCES public.job_stages(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'textarea', 'number', 'select', 'multiselect', 'upload', 'url')),
  options JSONB,
  is_required BOOLEAN DEFAULT true,
  question_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stage_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view questions" ON public.stage_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can view questions of active job stages" ON public.stage_questions FOR SELECT TO anon USING (
  EXISTS (
    SELECT 1 FROM public.job_stages js
    JOIN public.jobs j ON j.id = js.job_id
    WHERE js.id = stage_id AND j.status = 'active'
  )
);
CREATE POLICY "Admins and recruiters can manage questions" ON public.stage_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));

-- 7. CANDIDATES (CANDIDATOS)
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cv_url TEXT,
  cv_analysis JSONB,
  current_stage_id UUID REFERENCES public.job_stages(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'approved', 'reserve', 'rejected', 'archived')),
  classification TEXT CHECK (classification IN ('Forte', 'Desenvolvível', 'Risco')),
  final_score NUMERIC,
  alerts TEXT[] DEFAULT '{}',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view candidates" ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can insert candidates" ON public.candidates FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert candidates" ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins and recruiters can update candidates" ON public.candidates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));
CREATE POLICY "Admins can delete candidates" ON public.candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. CANDIDATE RESPONSES (RESPOSTAS DO FORMULÁRIO)
CREATE TABLE public.candidate_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.stage_questions(id) ON DELETE CASCADE NOT NULL,
  response_value TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view responses" ON public.candidate_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon can insert responses" ON public.candidate_responses FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Authenticated can insert responses" ON public.candidate_responses FOR INSERT TO authenticated WITH CHECK (true);

-- 9. CANDIDATE EVALUATIONS (AVALIAÇÕES POR ETAPA)
CREATE TABLE public.candidate_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  stage_id UUID REFERENCES public.job_stages(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES auth.users(id),
  score NUMERIC,
  max_score NUMERIC DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, stage_id, evaluator_id)
);

ALTER TABLE public.candidate_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view evaluations" ON public.candidate_evaluations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and recruiters can manage evaluations" ON public.candidate_evaluations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));

-- 10. CANDIDATE DISC (RESULTADOS DISC)
CREATE TABLE public.candidate_disc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL UNIQUE,
  d_score NUMERIC,
  i_score NUMERIC,
  s_score NUMERIC,
  c_score NUMERIC,
  summary TEXT,
  source TEXT CHECK (source IN ('manual', 'external')),
  external_url TEXT,
  file_url TEXT,
  alerts TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.candidate_disc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view disc" ON public.candidate_disc FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and recruiters can manage disc" ON public.candidate_disc FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'recruiter'));

-- 11. TRIGGERS PARA updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evaluations_updated_at BEFORE UPDATE ON public.candidate_evaluations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. AUTO-CREATE PROFILE + ADMIN ROLE ON FIRST SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  -- First user gets admin role
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'recruiter');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. FUNCTION TO CALCULATE CANDIDATE SCORE
CREATE OR REPLACE FUNCTION public.calculate_candidate_score(p_candidate_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_total_weighted_score NUMERIC := 0;
  v_total_weight NUMERIC := 0;
  v_final_score NUMERIC;
  v_classification TEXT;
  v_culture_score NUMERIC;
  v_min_culture INTEGER;
  v_culture_rejection BOOLEAN;
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

  -- Determine classification
  IF v_final_score IS NULL THEN
    v_classification := NULL;
  ELSIF v_final_score >= 80 THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
