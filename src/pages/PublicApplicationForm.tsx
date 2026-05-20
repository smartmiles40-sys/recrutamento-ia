import PublicLayout from "@/components/layout/PublicLayout";
import { useState, useEffect, Component, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { Send, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import FileUpload from "@/components/shared/FileUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Error Boundary to prevent white screen crashes
class FormErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("FormErrorBoundary caught:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <PublicLayout>
          <div className="flex min-h-[50vh] items-center justify-center">
            <div className="text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-bold text-foreground">Ocorreu um erro</h2>
              <p className="text-sm text-muted-foreground">Houve um problema ao carregar o formulário.</p>
              <button onClick={() => window.location.reload()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                Recarregar Página
              </button>
            </div>
          </div>
        </PublicLayout>
      );
    }
    return this.props.children;
  }
}

interface JobData {
  id: string;
  title: string;
  area: string;
  status: string;
  practical_case: string | null;
  required_skills: string[] | null;
  behavioral_profile: string | null;
  intro_title: string | null;
  intro_message: string | null;
  disc_test_url: string | null;
}

interface StageData {
  id: string;
  stage_key: string;
  label: string;
  stage_order: number;
  is_enabled: boolean;
}

interface QuestionData {
  id: string;
  stage_id: string;
  question_text: string;
  field_type: string;
  options: any;
  is_required: boolean;
  question_order: number;
}

function PublicApplicationFormInner() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobData | null>(null);
  const [stages, setStages] = useState<StageData[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [discFile, setDiscFile] = useState<File | null>(null);
  const [discError, setDiscError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [questionFiles, setQuestionFiles] = useState<Record<string, File | null>>({});
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [lgpdError, setLgpdError] = useState(false);
  const { toast } = useToast();

  const sanitizeFileName = (name: string) =>
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]/g, "_");

  const isBlank = (value: unknown) => String(value ?? "").trim().length === 0;

  useEffect(() => {
    async function loadJob() {
      if (!jobId) return;
      const { data: jobData } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .eq("status", "active")
        .maybeSingle();

      if (!jobData) { setLoading(false); return; }
      setJob(jobData as JobData);

      const { data: stageData } = await supabase
        .from("job_stages")
        .select("*")
        .eq("job_id", jobId)
        .eq("is_enabled", true)
        .order("stage_order");
      setStages((stageData || []) as StageData[]);

      if (stageData?.length) {
        const stageIds = stageData.map((s: any) => s.id);
        const { data: questionData } = await supabase
          .from("stage_questions")
          .select("*")
          .in("stage_id", stageIds)
          .order("question_order");
        setQuestions((questionData || []) as QuestionData[]);
      }
      setLoading(false);
    }
    loadJob();
  }, [jobId]);

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (!job) {
    return (
      <PublicLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-xl font-bold text-foreground">Vaga não encontrada</h2>
            <p className="mt-2 text-sm text-muted-foreground">O link pode estar incorreto ou a vaga foi encerrada.</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Build form steps
  const discStage = stages.find(s => s.stage_key === "disc");
  const formSteps: { type: "details" | "personal" | "cv" | "disc" | "stage"; stageId?: string; label: string }[] = [
    { type: "details", label: "Sobre a Vaga" },
    { type: "personal", label: "Dados Pessoais" },
    { type: "cv", label: "Currículo" },
  ];

  // Only include stages that actually have questions configured (skip empty stages to avoid blank screens)
  const questionStages = stages.filter(s => 
    s.stage_key !== "cv_upload" && s.stage_key !== "disc" && s.stage_key !== "application" &&
    questions.some(q => q.stage_id === s.id)
  );
  questionStages.forEach((s, i) => {
    formSteps.push({ type: "stage", stageId: s.id, label: s.label || `Etapa ${i + 4}` });
  });

  // Get extra questions from the application stage (exclude duplicates: nome, email, telefone)
  const applicationStage = stages.find(s => s.stage_key === "application");
  const applicationExtraQuestions = applicationStage
    ? questions.filter(q => q.stage_id === applicationStage.id && 
        !["nome completo", "e-mail", "telefone"].includes(q.question_text.toLowerCase().trim()))
    : [];

  // Add DISC step at the end if DISC stage is enabled
  if (discStage) {
    formSteps.push({ type: "disc", label: "Teste DISC" });
  }

  const totalSteps = formSteps.length;
  const currentStep = formSteps[Math.min(step, totalSteps - 1)];

  const handleCvUpload = () => {
    if (!cvFile) {
      setCvError("Por favor, envie seu currículo antes de avançar.");
      return;
    }
    setCvError(null);
    setStep((prev) => prev + 1);
  };

  const handleDiscUpload = async () => {
    // DISC is optional - if no file, just advance
    if (!discFile) {
      setStep(step + 1);
      return;
    }
    setAnalyzing(true);
    setDiscError(null);
    try {
      const sanitizedName = sanitizeFileName(discFile.name);
      const fileName = `${jobId}/${Date.now()}-disc-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("disc-files").upload(fileName, discFile);
      if (uploadError) throw new Error("Erro ao enviar arquivo DISC: " + uploadError.message);
      setFormData(prev => ({ ...prev, __disc_file_url: fileName }));
      setStep((prev) => prev + 1);
    } catch (e: any) {
      setDiscError(e.message);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep?.type === "cv") {
        handleCvUpload();
      } else if (currentStep?.type === "disc") {
        await handleDiscUpload();
      } else {
        setStep(step + 1);
      }
    } catch (e: any) {
      console.error("handleNext error:", e);
      toast({ title: "Erro", description: "Ocorreu um erro ao avançar. Tente novamente.", variant: "destructive" });
    }
  };

  const submitCandidate = async (candidateId: string, discFileUrlOverride?: string) => {
    const discUrl = discFileUrlOverride || formData.__disc_file_url;
    let cvUrl = formData.__cv_url || null;

    if (!cvUrl && cvFile) {
      const sanitizedName = sanitizeFileName(cvFile.name);
      const fileName = `${jobId}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("cvs").upload(fileName, cvFile);
      if (uploadError) throw new Error("Erro ao enviar currículo: " + uploadError.message);
      cvUrl = fileName;
    }

    // Create candidate
    const { error: candidateError } = await supabase
      .from("candidates")
      .insert([{
        id: candidateId,
        job_id: jobId,
        name: formData.name || "Sem nome",
        email: formData.email || "sem@email.com",
        phone: formData.phone || null,
        cv_url: cvUrl,
        status: "in_progress",
        lgpd_consent: true,
        lgpd_consent_date: new Date().toISOString(),
      } as any]);
    if (candidateError) throw candidateError;

    // Upload question files first
    const uploadedFileUrls: Record<string, string> = {};
    for (const [qKey, file] of Object.entries(questionFiles)) {
      if (!file) continue;
      const qId = qKey.replace("qfile_", "");
      const sanitizedName = file.name
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${jobId}/${candidateId}/${Date.now()}-${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("candidate-uploads").upload(fileName, file);
      if (uploadError) throw new Error("Erro ao enviar arquivo: " + uploadError.message);
      uploadedFileUrls[qId] = fileName;
    }

    // Save responses
    const responseEntries = Object.entries(formData)
      .filter(([key]) => key.startsWith("q_"))
      .map(([key, value]) => ({
        candidate_id: candidateId,
        question_id: key.replace("q_", ""),
        response_value: value,
        file_url: uploadedFileUrls[key.replace("q_", "")] || null,
      }));
    for (const [qId, fileUrl] of Object.entries(uploadedFileUrls)) {
      if (!responseEntries.find(r => r.question_id === qId)) {
        responseEntries.push({
          candidate_id: candidateId,
          question_id: qId,
          response_value: null,
          file_url: fileUrl,
        });
      }
    }
    if (responseEntries.length > 0) {
      await supabase.from("candidate_responses").insert(responseEntries);
    }

    // Trigger CV analysis in background
    if (cvUrl) {
      supabase.functions.invoke("analyze-cv", {
        body: {
          cvPath: cvUrl,
          candidateId,
          jobId,
          jobTitle: job!.title,
          jobArea: job!.area,
          requiredSkills: job!.required_skills,
          behavioralProfile: job!.behavioral_profile,
        },
      }).catch(() => {});
    }

    // Save DISC file if uploaded
    if (discUrl) {
      await supabase.from("candidate_disc").insert([{
        candidate_id: candidateId,
        file_url: discUrl,
        source: "formulario",
      }]);

      supabase.functions.invoke("analyze-disc", {
        body: { candidateId },
      }).catch(() => {});
    }

    // Trigger AI scoring of responses in background
    supabase.functions.invoke("score-candidate-responses", {
      body: { candidateId, jobId },
    }).catch(() => {});

    setSubmitted(true);
  };

  const handleSubmit = async () => {
    if (!cvFile && !formData.__cv_url) {
      setCvError("Por favor, envie seu currículo antes de concluir.");
      toast({ title: "Currículo obrigatório", description: "Envie seu currículo para finalizar a candidatura.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const candidateId = crypto.randomUUID();
      await submitCandidate(candidateId);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const textareaClass = "min-h-[80px] w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const hasMissingRequiredAnswers = (stageId: string) =>
    questions
      .filter((q) => q.stage_id === stageId && q.is_required)
      .some((q) => {
        if (q.field_type === "upload") {
          return !questionFiles[`qfile_${q.id}`];
        }
        return isBlank(formData[`q_${q.id}`]);
      });

  if (submitted) {
    return (
      <PublicLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20">
              <CheckCircle className="h-8 w-8 text-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Candidatura Enviada!</h2>
            <p className="mt-2 text-muted-foreground">Sua aplicação para <strong>{job.title}</strong> será analisada.</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const progressPercent = ((step + 1) / totalSteps) * 100;

  return (
    <PublicLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">{job.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{job.area}</p>
      </div>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Etapa {step + 1} de {totalSteps}</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        {currentStep?.type === "details" && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-bold text-foreground">{job.intro_title || "Sobre a Vaga"}</h2>
            <p className="whitespace-pre-line text-sm text-muted-foreground">{job.intro_message || "Leia com atenção as informações abaixo antes de iniciar sua candidatura."}</p>
            
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">Cargo</h3>
                <p className="mt-1 text-sm text-muted-foreground">{job.title}</p>
              </div>

              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold text-foreground">Área</h3>
                <p className="mt-1 text-sm text-muted-foreground">{job.area}</p>
              </div>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-foreground">Competências Desejadas</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {job.required_skills.map((skill, i) => (
                      <span key={i} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.practical_case && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-foreground">Caso Prático</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{job.practical_case}</p>
                </div>
              )}

              {job.behavioral_profile && (
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <h3 className="text-sm font-semibold text-foreground">Perfil Comportamental</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{job.behavioral_profile}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep?.type === "personal" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Dados Pessoais</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Nome Completo *</label>
                <input value={formData.name || ""} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} className={inputClass} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Email *</label>
                <input type="email" value={formData.email || ""} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className={inputClass} required />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Telefone *</label>
                <input value={formData.phone || ""} onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))} className={inputClass} />
              </div>
            </div>
            {applicationExtraQuestions.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
                {applicationExtraQuestions.map((q) => (
                  <div key={q.id}>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {q.question_text}{q.is_required && " *"}
                    </label>
                  {q.field_type === "textarea" ? (
                    <textarea
                      value={formData[`q_${q.id}`] || ""}
                      onChange={(e) => setFormData(p => ({ ...p, [`q_${q.id}`]: e.target.value }))}
                      className={textareaClass}
                    />
                  ) : q.field_type === "upload" ? (
                    <FileUpload
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/*"
                      label="Clique para enviar arquivo"
                      hint="Arraste ou clique para selecionar"
                      icon="file"
                      maxSizeMB={10}
                      onChange={(f) => setQuestionFiles(p => ({ ...p, [`qfile_${q.id}`]: f }))}
                    />
                  ) : (
                      <input
                        type={q.field_type === "url" ? "url" : "text"}
                        value={formData[`q_${q.id}`] || ""}
                        onChange={(e) => setFormData(p => ({ ...p, [`q_${q.id}`]: e.target.value }))}
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep?.type === "cv" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Currículo</h2>
            <p className="text-sm text-muted-foreground">Envie seu currículo em PDF (máx. 5 MB).</p>
            <FileUpload
              accept=".pdf,application/pdf"
              label="Arraste seu currículo ou clique para selecionar"
              hint="Apenas PDF, até 5 MB"
              icon="file"
              maxSizeMB={5}
              onChange={(file) => { setCvFile(file); setCvError(null); }}
            />
            {cvError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{cvError}
              </div>
            )}
            {analyzing && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-foreground">Enviando currículo...</p>
              </div>
            )}
          </div>
        )}

        {currentStep?.type === "disc" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">Teste DISC</h2>
            {job.disc_test_url ? (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="mb-2 text-sm text-foreground font-medium">Faça o teste DISC no link abaixo e depois envie o PDF com o resultado:</p>
                <a href={job.disc_test_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
                  Abrir Teste DISC ↗
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Envie o PDF com o resultado do seu teste DISC.</p>
            )}
            <FileUpload
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/*"
              label="Envie o PDF com o resultado do DISC"
              hint="Formatos aceitos: PDF, PNG, JPG · até 5 MB"
              icon="file"
              maxSizeMB={5}
              onChange={(file) => { setDiscFile(file); setDiscError(null); }}
            />
            {discError && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />{discError}
              </div>
            )}
            {analyzing && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-foreground">Enviando arquivo DISC...</p>
              </div>
            )}
          </div>
        )}

        {currentStep?.type === "stage" && currentStep.stageId && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-bold text-foreground">{currentStep.label}</h2>
            {questions
              .filter(q => q.stage_id === currentStep.stageId)
              .map((q) => (
                <div key={q.id}>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    {q.question_text}{q.is_required && " *"}
                  </label>
                  {q.field_type === "textarea" ? (
                    <textarea
                      value={formData[`q_${q.id}`] || ""}
                      onChange={(e) => setFormData(p => ({ ...p, [`q_${q.id}`]: e.target.value }))}
                      className={textareaClass}
                    />
                  ) : q.field_type === "upload" ? (
                    <FileUpload
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,application/pdf,image/*"
                      label="Clique para enviar arquivo"
                      hint="Arraste ou clique para selecionar"
                      icon="file"
                      maxSizeMB={10}
                      onChange={(f) => setQuestionFiles(p => ({ ...p, [`qfile_${q.id}`]: f }))}
                    />
                  ) : q.field_type === "select" && q.options ? (
                    <select
                      value={formData[`q_${q.id}`] || ""}
                      onChange={(e) => setFormData(p => ({ ...p, [`q_${q.id}`]: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">Selecione...</option>
                      {(Array.isArray(q.options) ? q.options : []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : q.field_type === "number" ? (
                    <input
                      type="number"
                      value={formData[`q_${q.id}`] || ""}
                      onChange={(e) => setFormData(p => ({ ...p, [`q_${q.id}`]: e.target.value }))}
                      className={inputClass}
                    />
                  ) : (
                    <input
                      value={formData[`q_${q.id}`] || ""}
                      onChange={(e) => setFormData(p => ({ ...p, [`q_${q.id}`]: e.target.value }))}
                      className={inputClass}
                    />
                  )}
                </div>
              ))}
            {questions.filter(q => q.stage_id === currentStep.stageId).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma pergunta configurada para esta etapa.</p>
            )}
          </div>
        )}

        {/* LGPD Consent - shown on last step */}
        {step === totalSteps - 1 && (
          <div className="mt-6 space-y-2">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="lgpd-consent"
                checked={lgpdConsent}
                onChange={(e) => {
                  setLgpdConsent(e.target.checked);
                  if (e.target.checked) setLgpdError(false);
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-primary accent-primary cursor-pointer"
              />
              <label htmlFor="lgpd-consent" className="text-[13px] leading-relaxed text-muted-foreground cursor-pointer" style={{ fontFamily: 'Inter, sans-serif' }}>
                Li e concordo com a{" "}
                <a
                  href="/privacidade"
                  target="_blank"
                  className="text-primary underline hover:opacity-80"
                >
                  Política de Privacidade
                </a>{" "}
                da Se Tu For, Eu Vou e autorizo o uso dos meus dados pessoais para fins de recrutamento e seleção pelo período de 12 meses.
              </label>
            </div>
            {lgpdError && (
              <p className="text-sm text-destructive ml-7">
                Você precisa aceitar a Política de Privacidade para continuar.
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0 || analyzing}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            Voltar
          </button>
          {step < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              disabled={analyzing || (currentStep?.type === "cv" && !cvFile) || (currentStep?.type === "personal" && (!formData.name || !formData.email || !formData.phone)) || (currentStep?.type === "stage" && currentStep.stageId && hasMissingRequiredAnswers(currentStep.stageId))}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {currentStep?.type === "cv" ? "Próximo" : currentStep?.type === "disc" ? (analyzing ? "Enviando..." : "Enviar DISC") : "Próximo"}
            </button>
          ) : (
            <button
              onClick={async () => {
                if (!lgpdConsent) {
                  setLgpdError(true);
                  return;
                }
                // If last step is DISC, upload DISC file first (if provided) then submit
                if (currentStep?.type === "disc") {
                  setSubmitting(true);
                  setAnalyzing(true);
                  setDiscError(null);
                  try {
                    let discFileName: string | undefined;
                    if (discFile) {
                      const sanitizedName = discFile.name
                        ? sanitizeFileName(discFile.name)
                        : "";
                      discFileName = `${jobId}/${Date.now()}-disc-${sanitizedName}`;
                      const { error: uploadError } = await supabase.storage.from("disc-files").upload(discFileName, discFile);
                      if (uploadError) throw new Error("Erro ao enviar arquivo DISC: " + uploadError.message);
                    }
                    const candidateId = crypto.randomUUID();
                    await submitCandidate(candidateId, discFileName);
                  } catch (e: any) {
                    setDiscError(e.message);
                    toast({ title: "Erro", description: e.message, variant: "destructive" });
                  } finally {
                    setAnalyzing(false);
                    setSubmitting(false);
                  }
                } else {
                  handleSubmit();
                }
              }}
              disabled={submitting || analyzing || (currentStep?.type === "stage" && currentStep.stageId && hasMissingRequiredAnswers(currentStep.stageId))}
              className="flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground transition-all duration-200 hover:opacity-90 disabled:opacity-50"
              style={{
                opacity: lgpdConsent ? undefined : 0.4,
                pointerEvents: lgpdConsent ? undefined : 'none',
              }}
            >
              {(submitting || analyzing) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {(submitting || analyzing) ? "Enviando..." : "Enviar Candidatura"}
            </button>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export default function PublicApplicationFormWrapper() {
  return (
    <FormErrorBoundary>
      <PublicApplicationFormInner />
    </FormErrorBoundary>
  );
}