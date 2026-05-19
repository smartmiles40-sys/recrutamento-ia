import AppLayout from "@/components/layout/AppLayout";
import { useJob, useUpdateJob } from "@/hooks/useJobs";
import {
  useJobStages, useUpdateStage, useDeleteStage,
  useAllStageQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion,
} from "@/hooks/useStages";
import {
  useBlockTemplates,
  useAddBlockToJob,
  useRestoreBlockQuestions,
} from "@/hooks/useBlockTemplates";
import { useCandidatesByJob } from "@/hooks/useCandidates";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Plus, X, Trash2, ChevronDown, ChevronUp, Settings, RotateCcw, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const AREAS = ["Comercial", "Operações", "Marketing", "Financeiro", "Relacionamento"];
const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "select", label: "Múltipla escolha" },
  { value: "upload", label: "Upload" },
  { value: "url", label: "URL" },
];

export default function JobConfig() {
  const { jobId } = useParams<{ jobId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("textarea");
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [deleteStageId, setDeleteStageId] = useState<string | null>(null);

  const { data: job, isLoading, isError, error, refetch } = useJob(jobId);
  const { data: stages = [] } = useJobStages(jobId);
  const { data: questions = [] } = useAllStageQuestions(jobId);
  const { data: jobCandidates = [] } = useCandidatesByJob(jobId);
  const { data: blockTemplates = [] } = useBlockTemplates();
  const updateJob = useUpdateJob();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const addBlockToJob = useAddBlockToJob();
  const restoreBlock = useRestoreBlockQuestions();

  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [behavioralProfile, setBehavioralProfile] = useState("");
  const [practicalCase, setPracticalCase] = useState("");
  const [minCulture, setMinCulture] = useState(60);
  const [minTechnical, setMinTechnical] = useState(60);
  const [cultureRejection, setCultureRejection] = useState(true);
  const [introTitle, setIntroTitle] = useState("Sobre a Vaga");
  const [introMessage, setIntroMessage] = useState("Leia com atenção as informações abaixo antes de iniciar sua candidatura.");
  const [discTestUrl, setDiscTestUrl] = useState("");
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  // Sync form once per job id. Tying to job.id (not a boolean flag) lets the form
  // re-sync when navigating between jobs, but avoids overwriting the user's edits
  // every time the query refetches.
  useEffect(() => {
    if (!job || initializedFor === job.id) return;
    setTitle(job.title);
    setArea(job.area);
    setSkills(job.required_skills || []);
    setBehavioralProfile(job.behavioral_profile || "");
    setPracticalCase(job.practical_case || "");
    setMinCulture(job.min_culture_score);
    setMinTechnical(job.min_technical_score);
    setCultureRejection(job.culture_rejection_enabled);
    setIntroTitle((job as any).intro_title || "Sobre a Vaga");
    setIntroMessage((job as any).intro_message || "Leia com atenção as informações abaixo antes de iniciar sua candidatura.");
    setDiscTestUrl((job as any).disc_test_url || "");
    setInitializedFor(job.id);
  }, [job, initializedFor]);

  const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";
  const applicationLink = jobId ? `${window.location.origin}/aplicar/${jobId}` : "";

  const handleCopyLink = () => {
    if (!applicationLink) return;
    navigator.clipboard.writeText(applicationLink);
    setCopied(true);
    toast({ title: "Link copiado!", description: applicationLink });
    setTimeout(() => setCopied(false), 2000);
  };

  // The link section depends only on jobId from the URL — render it as soon as
  // we have the param, even while the job query is still in-flight or failed,
  // so the recruiter can always copy the candidate link.
  const linkSection = jobId ? (
    <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
      <label className="mb-2 block text-sm font-semibold text-foreground">Link de Candidatura Externa</label>
      <div className="flex items-center gap-2">
        <input readOnly value={applicationLink} className={inputClass + " flex-1 bg-muted text-muted-foreground"} />
        <button onClick={handleCopyLink} className="flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground hover:opacity-90">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  ) : null;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl">
          {linkSection}
          <div className="flex min-h-[30vh] items-center justify-center text-muted-foreground">Carregando configurações...</div>
        </div>
      </AppLayout>
    );
  }
  if (isError || !job) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-4xl">
          {linkSection}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
            <p className="text-sm font-semibold text-destructive">{isError ? "Erro ao carregar a vaga" : "Vaga não encontrada"}</p>
            {error instanceof Error && <p className="mt-1 text-xs text-muted-foreground">{error.message}</p>}
            <button onClick={() => refetch()} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tentar novamente</button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleSave = () => {
    updateJob.mutate({
      id: job.id,
      title,
      area,
      required_skills: skills,
      behavioral_profile: behavioralProfile || null,
      practical_case: practicalCase || null,
      min_culture_score: minCulture,
      min_technical_score: minTechnical,
      culture_rejection_enabled: cultureRejection,
      intro_title: introTitle || "Sobre a Vaga",
      intro_message: introMessage || "",
      disc_test_url: discTestUrl || null,
    } as any);
  };

  const handleAddBlock = (block: any) => {
    addBlockToJob.mutate({
      jobId: jobId!,
      block,
      stageOrder: stages.length + 1,
      weight: block.suggested_weight || 0,
    });
    setShowBlockPicker(false);
  };

  const handleAddQuestion = (stageId: string) => {
    if (!newQuestionText.trim()) return;
    const stageQuestions = questions.filter(q => q.stage_id === stageId);
    createQuestion.mutate({
      stage_id: stageId,
      question_text: newQuestionText.trim(),
      field_type: newQuestionType,
      is_required: true,
      question_order: stageQuestions.length + 1,
    } as any);
    setNewQuestionText("");
    setNewQuestionType("textarea");
  };

  const totalWeight = stages.filter(s => s.is_enabled).reduce((sum, s) => sum + s.weight, 0);

  // Block templates already added to this job (by source_block_id)
  const usedBlockIds = stages.map((s: any) => s.source_block_id).filter(Boolean);
  const availableBlocks = blockTemplates.filter(b => b.is_active);

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/vagas" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">Configurar Vaga</h1>
            <p className="text-sm text-muted-foreground">{job.title} • {jobCandidates.length} candidatos</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateJob.mutate({ id: job.id, status: job.status === "active" ? "draft" : "active" })}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                job.status === "active"
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-success text-foreground hover:bg-success/80"
              )}
            >
              {job.status === "active" ? "Desativar" : "Ativar Vaga"}
            </button>
          </div>
        </div>

        {linkSection}

        <div className="space-y-6">
          {/* Intro Step Config */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">Etapa Inicial (Detalhes da Vaga)</h2>
            <p className="mb-3 text-xs text-muted-foreground">Configure o título e a mensagem que o candidato verá antes de iniciar o preenchimento.</p>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Título da Etapa</label>
                <input value={introTitle} onChange={(e) => setIntroTitle(e.target.value)} className={inputClass} placeholder="Ex: Sobre a Vaga" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Mensagem / Descrição</label>
                <textarea
                  value={introMessage}
                  onChange={(e) => setIntroMessage(e.target.value)}
                  className="min-h-[100px] w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Descreva os detalhes da vaga, requisitos, benefícios, etc."
                />
              </div>
            </div>
          </div>

          {/* Basic info */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">Informações Básicas</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Título</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Área</label>
                <select value={area} onChange={(e) => setArea(e.target.value)} className={inputClass}>
                  {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Perfil Comportamental</label>
                <input value={behavioralProfile} onChange={(e) => setBehavioralProfile(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Link do Teste DISC</label>
                <input value={discTestUrl} onChange={(e) => setDiscTestUrl(e.target.value)} placeholder="https://... (link para o candidato fazer o teste)" className={inputClass} />
                <p className="mt-1 text-[10px] text-muted-foreground">Este link ficará visível na ficha do candidato para o recrutador enviar ao candidato</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={cultureRejection} onChange={(e) => setCultureRejection(e.target.checked)} className="h-4 w-4 rounded border-input" />
                <label className="text-sm text-foreground">Rejeição por cultura ativa</label>
              </div>
            </div>
          </div>

          {/* Skills */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">Competências Técnicas</h2>
            <div className="mb-3 flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="flex items-center gap-1 rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                  {skill}
                  <button onClick={() => setSkills(skills.filter((s) => s !== skill))} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { if (newSkill.trim()) setSkills([...skills, newSkill.trim()]); setNewSkill(""); } }} placeholder="Adicionar competência..." className={inputClass + " flex-1"} />
              <button onClick={() => { if (newSkill.trim()) { setSkills([...skills, newSkill.trim()]); setNewSkill(""); } }} className="flex h-10 items-center gap-1 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"><Plus className="h-4 w-4" /> Adicionar</button>
            </div>
          </div>

          {/* Blocks / Stages */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">Blocos da Vaga</h2>
              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-bold", totalWeight === 100 ? "text-foreground" : "text-destructive")}>
                  Peso total: {totalWeight}%
                </span>
                <button
                  onClick={() => setShowBlockPicker(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
                >
                  <Library className="h-3.5 w-3.5" /> Adicionar Bloco
                </button>
              </div>
            </div>

            {stages.length === 0 ? (
              <div className="py-8 text-center">
                <Library className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum bloco configurado</p>
                <button onClick={() => setShowBlockPicker(true)} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Adicionar Blocos da Biblioteca
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stages.map((stage, idx) => {
                  const stageQuestions = questions.filter(q => q.stage_id === stage.id);
                  const isExpanded = expandedStage === stage.id;
                  const sourceBlockId = (stage as any).source_block_id;
                  return (
                    <div key={stage.id} className="rounded-lg border border-border bg-background">
                      <div className="flex items-center gap-3 p-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-muted-foreground">{idx + 1}</span>
                        <button onClick={() => setExpandedStage(isExpanded ? null : stage.id)} className="text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <div className="flex-1">
                          <input
                            value={stage.label}
                            onChange={(e) => updateStage.mutate({ id: stage.id, label: e.target.value })}
                            className="w-full bg-transparent text-sm font-semibold text-foreground focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={stage.is_enabled}
                            onChange={(e) => updateStage.mutate({ id: stage.id, is_enabled: e.target.checked })}
                            className="h-4 w-4 rounded border-input"
                            title="Ativo"
                          />
                          <input
                            type="number" min={0} max={100}
                            value={stage.weight}
                            onChange={(e) => updateStage.mutate({ id: stage.id, weight: Number(e.target.value) })}
                            className="h-8 w-16 rounded border border-input bg-background px-2 text-center text-xs"
                          />
                          <span className="text-xs text-muted-foreground">%</span>
                          {sourceBlockId && (
                            <button
                              onClick={() => restoreBlock.mutate({ stageId: stage.id, blockId: sourceBlockId })}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title="Restaurar bloco original"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => setDeleteStageId(stage.id)} className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-3">
                          <div className="mb-2 flex items-center gap-2">
                            <label className="flex items-center gap-1.5 text-xs text-foreground">
                              <input
                                type="checkbox"
                                checked={stage.is_eliminatory}
                                onChange={(e) => updateStage.mutate({ id: stage.id, is_eliminatory: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-input"
                              />
                              Eliminatório
                            </label>
                            {stage.is_eliminatory && (
                              <div className="flex items-center gap-1">
                                <label className="text-[10px] text-muted-foreground">Score mín:</label>
                                <input
                                  type="number" min={0} max={100}
                                  value={stage.min_score ?? ""}
                                  onChange={(e) => updateStage.mutate({ id: stage.id, min_score: e.target.value ? Number(e.target.value) : null })}
                                  className="h-6 w-14 rounded border border-input bg-background px-1 text-center text-[10px]"
                                />
                              </div>
                            )}
                          </div>

                          {/* Critérios de Avaliação da IA (override por vaga) */}
                          <div className="mb-3">
                            <label className="mb-1 block text-xs font-semibold text-foreground">Critérios de Avaliação da IA</label>
                            <p className="mb-1 text-[10px] text-muted-foreground">Instruções específicas para a IA avaliar esta etapa nesta vaga. Herdado do template global, editável aqui.</p>
                            <textarea
                              value={(stage as any).evaluation_criteria || ""}
                              onChange={(e) => updateStage.mutate({ id: stage.id, evaluation_criteria: e.target.value || null } as any)}
                              placeholder="Critérios específicos de avaliação para esta etapa..."
                              className="min-h-[80px] w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>

                          {/* Material de Referência (override por vaga) */}
                          <div className="mb-3">
                            <label className="mb-1 block text-xs font-semibold text-foreground">Material de Referência</label>
                            <p className="mb-1 text-[10px] text-muted-foreground">Material de apoio que a IA deve considerar (manual de cultura, diretrizes, etc.).</p>
                            <textarea
                              value={(stage as any).reference_material || ""}
                              onChange={(e) => updateStage.mutate({ id: stage.id, reference_material: e.target.value || null } as any)}
                              placeholder="Cole aqui trechos do manual de cultura, valores da empresa, etc."
                              className="min-h-[80px] w-full rounded-lg border border-input bg-background p-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>
                          <div className="space-y-2">
                            {stageQuestions.map((q) => (
                              <div key={q.id} className="flex items-start gap-2 rounded-md bg-muted/50 p-2">
                                <div className="flex-1">
                                  <input
                                    value={q.question_text}
                                    onChange={(e) => updateQuestion.mutate({ id: q.id, question_text: e.target.value })}
                                    className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                                  />
                                  <div className="mt-1 flex items-center gap-2">
                                    <select
                                      value={q.field_type}
                                      onChange={(e) => updateQuestion.mutate({ id: q.id, field_type: e.target.value })}
                                      className="h-6 rounded border border-input bg-background px-1 text-[10px]"
                                    >
                                      {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                    </select>
                                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <input
                                        type="checkbox"
                                        checked={q.is_required}
                                        onChange={(e) => updateQuestion.mutate({ id: q.id, is_required: e.target.checked })}
                                        className="h-3 w-3"
                                      />
                                      Obrigatória
                                    </label>
                                  </div>
                                </div>
                                <button onClick={() => deleteQuestion.mutate(q.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <input
                              value={newQuestionText}
                              onChange={(e) => setNewQuestionText(e.target.value)}
                              placeholder="Nova pergunta..."
                              className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm"
                            />
                            <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} className="h-8 rounded border border-input bg-background px-2 text-xs">
                              {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                            </select>
                            <button onClick={() => handleAddQuestion(stage.id)} className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Eliminatory */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-4 font-display text-base font-bold text-foreground">Critérios Eliminatórios</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Score Mínimo Cultural</label>
                <input type="number" min={0} max={100} value={minCulture} onChange={(e) => setMinCulture(Number(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Score Mínimo Técnico</label>
                <input type="number" min={0} max={100} value={minTechnical} onChange={(e) => setMinTechnical(Number(e.target.value))} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pb-8">
            <button onClick={handleSave} disabled={updateJob.isPending} className="rounded-lg bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground hover:opacity-90 disabled:opacity-50">
              {updateJob.isPending ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>
      </div>

      {/* Block Picker Dialog */}
      <Dialog open={showBlockPicker} onOpenChange={setShowBlockPicker}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Adicionar Bloco da Biblioteca</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
            {availableBlocks.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum bloco disponível na biblioteca.</p>
            ) : (
              availableBlocks.map((block) => {
                const alreadyUsed = usedBlockIds.includes(block.id);
                return (
                  <button
                    key={block.id}
                    disabled={alreadyUsed}
                    onClick={() => handleAddBlock(block)}
                    className={cn(
                      "w-full rounded-lg border border-border p-4 text-left transition-all",
                      alreadyUsed
                        ? "cursor-not-allowed bg-muted/50 opacity-50"
                        : "bg-card hover:border-accent hover:shadow-card-hover"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{block.name}</h3>
                        {block.description && <p className="mt-0.5 text-xs text-muted-foreground">{block.description}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {block.is_eliminatory && (
                          <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">Eliminatório</span>
                        )}
                        {block.suggested_weight > 0 && (
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{block.suggested_weight}%</span>
                        )}
                        {alreadyUsed && (
                          <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">Já adicionado</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Stage Confirmation */}
      <AlertDialog open={!!deleteStageId} onOpenChange={() => setDeleteStageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bloco da vaga?</AlertDialogTitle>
            <AlertDialogDescription>As perguntas deste bloco serão removidas desta vaga. Respostas já coletadas não serão apagadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteStageId) deleteStage.mutate(deleteStageId); setDeleteStageId(null); }}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
