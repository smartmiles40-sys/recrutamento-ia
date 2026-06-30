import AppLayout from "@/components/layout/AppLayout";
import { useCandidate, useUpdateCandidate, useDeleteCandidate, PIPELINE_STAGES, PipelineStage } from "@/hooks/useCandidates";
import { useJob } from "@/hooks/useJobs";
import { useJobStages } from "@/hooks/useStages";
import { useCandidateEvaluations, useUpsertEvaluation, useCandidateDisc, useUpsertDisc } from "@/hooks/useEvaluations";
import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Info, Trash2, Archive, Edit2, ExternalLink, RefreshCw, Loader2, Calendar, Download, MessageSquare, CheckCircle2, XCircle, ChevronDown, ChevronRight, FileText, Send } from "lucide-react";
import { useCandidateNotes, useAddCandidateNote } from "@/hooks/useCandidateNotes";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { generateCandidateReport } from "@/lib/reportPdf";
import logo from "@/assets/logo-horizontal-dark-teal.png";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDelete, setShowDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [analyzingCv, setAnalyzingCv] = useState(false);
  const [cvActionLoading, setCvActionLoading] = useState(false);
  const [analyzingDisc, setAnalyzingDisc] = useState(false);
  const [showResponses, setShowResponses] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [pendingStage, setPendingStage] = useState<PipelineStage | null>(null);
  const [noteText, setNoteText] = useState("");

  const { data: candidate, isLoading } = useCandidate(id);
  const { data: job } = useJob(candidate?.job_id);
  const { data: stages = [] } = useJobStages(candidate?.job_id);
  const { data: evaluations = [] } = useCandidateEvaluations(id);
  const { data: disc } = useCandidateDisc(id);
  const upsertEval = useUpsertEvaluation();
  const upsertDisc = useUpsertDisc();
  const updateCandidate = useUpdateCandidate();
  const deleteCandidate = useDeleteCandidate();
  const { data: notes = [] } = useCandidateNotes(id);
  const addNote = useAddCandidateNote();

  // Fetch candidate responses with questions and stage info
  const { data: candidateResponses = [] } = useQuery({
    queryKey: ["candidate-responses", id],
    enabled: !!id && !!candidate?.job_id,
    queryFn: async () => {
      const { data: responses, error } = await supabase
        .from("candidate_responses")
        .select("id, response_value, file_url, question_id, created_at")
        .eq("candidate_id", id!);
      if (error) throw error;
      if (!responses?.length) return [];

      const questionIds = responses.map(r => r.question_id);
      const { data: questions } = await supabase
        .from("stage_questions")
        .select("id, question_text, stage_id, question_order")
        .in("id", questionIds);

      const stageIds = [...new Set(questions?.map(q => q.stage_id) || [])];
      const { data: stagesData } = await supabase
        .from("job_stages")
        .select("id, label, stage_order")
        .in("id", stageIds)
        .order("stage_order");

      const questionMap = new Map(questions?.map(q => [q.id, q]) || []);
      const stageMap = new Map(stagesData?.map(s => [s.id, s]) || []);

      return responses
        .map(r => {
          const q = questionMap.get(r.question_id);
          const s = q ? stageMap.get(q.stage_id) : null;
          return {
            ...r,
            code: r.id.substring(0, 8).toUpperCase(),
            question_text: q?.question_text || "",
            question_order: q?.question_order || 0,
            stage_label: s?.label || "",
            stage_order: s?.stage_order || 0,
          };
        })
        .sort((a, b) => a.stage_order - b.stage_order || a.question_order - b.question_order);
    },
  });

  if (isLoading) {
    return <AppLayout><div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">Carregando...</div></AppLayout>;
  }

  if (!candidate) {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <p className="text-muted-foreground">Candidato não encontrado.</p>
        </div>
      </AppLayout>
    );
  }

  const scorableStages = stages.filter(s => s.is_enabled && s.weight > 0);
  const totalWeight = scorableStages.reduce((sum, s) => sum + s.weight, 0);

  const getEvalScore = (stageId: string) => {
    const ev = evaluations.find(e => e.stage_id === stageId);
    return ev?.score ?? null;
  };

  const finalScore = totalWeight > 0
    ? scorableStages.reduce((sum, s) => {
        const sc = getEvalScore(s.id);
        return sc !== null ? sum + (sc * s.weight) / totalWeight : sum;
      }, 0)
    : null;

  const classification = finalScore === null ? null
    : finalScore >= 80 ? "Forte"
    : finalScore >= 70 ? "Desenvolvível"
    : "Risco";

  const handleScoreChange = (stageId: string, value: number) => {
    upsertEval.mutate({
      candidate_id: candidate.id,
      stage_id: stageId,
      score: Math.min(100, Math.max(0, value)),
      evaluator_id: user?.id,
    });
  };

  // Muda a etapa do pipeline mantendo o `status` em sincronia (igual ao Kanban),
  // para que Aprovados/Reprovados e os KPIs reflitam a decisão.
  const moveToStage = (val: PipelineStage) => {
    const status = val === "contratado" ? "approved" : val === "reprovado" ? "rejected" : "in_progress";
    updateCandidate.mutate({ id: candidate.id, pipeline_stage: val, status } as any);
  };

  const handleEdit = () => {
    setEditName(candidate.name);
    setEditEmail(candidate.email);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    updateCandidate.mutate({ id: candidate.id, name: editName, email: editEmail });
    setEditing(false);
  };

  const handleDelete = () => {
    deleteCandidate.mutate(candidate.id);
    navigate("/candidatos");
  };

  const handleAnalyzeCv = async () => {
    if (!candidate.cv_url || !job) return;
    setAnalyzingCv(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-cv", {
        body: {
          cvPath: candidate.cv_url,
          candidateId: candidate.id,
          jobId: candidate.job_id,
          jobTitle: job.title,
          jobArea: job.area,
          requiredSkills: job.required_skills,
          behavioralProfile: job.behavioral_profile,
        },
      });
      if (error) throw error;
      toast({ title: "Análise concluída", description: `Score: ${data?.score ?? "—"} — ${data?.recommendation ?? ""}` });
      // Refetch candidate data
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Erro na análise", description: e.message || "Erro ao analisar currículo", variant: "destructive" });
    } finally {
      setAnalyzingCv(false);
    }
  };

  const handleCvAction = async (mode: "view" | "download") => {
    if (!candidate.cv_url) return;

    setCvActionLoading(true);
    try {
      const fileName = candidate.cv_url.split("/").pop() || "curriculo.pdf";
      const { data, error } = await supabase.storage
        .from("cvs")
        .createSignedUrl(candidate.cv_url, 60 * 10, mode === "download" ? { download: fileName } : undefined);

      if (error || !data?.signedUrl) throw error || new Error("Não foi possível gerar o link do currículo");

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast({ title: "Erro ao abrir currículo", description: e.message || "Tente novamente", variant: "destructive" });
    } finally {
      setCvActionLoading(false);
    }
  };

  const handleGenerateResponsesPdf = () => {
    const pipelineKey = (candidate as any).pipeline_stage || "nova_candidatura";
    const pipelineLabel = PIPELINE_STAGES.find(s => s.key === pipelineKey)?.label || null;

    const scoreRows = scorableStages.map((s) => {
      const sc = getEvalScore(s.id);
      const contribution = sc !== null && totalWeight > 0 ? Math.round((sc * s.weight) / totalWeight) : null;
      return { label: s.label, weight: s.weight, score: sc, contribution };
    });

    const ok = generateCandidateReport({
      logoSrc: logo,
      candidate: {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone,
        applied_at: candidate.applied_at,
        status: candidate.status,
        pipeline_stage: pipelineKey,
        pipeline_label: pipelineLabel,
        lgpd_consent: (candidate as any).lgpd_consent,
        lgpd_consent_date: (candidate as any).lgpd_consent_date,
        alerts: candidate.alerts,
        cv_analysis: candidate.cv_analysis,
      },
      job: job ? { title: job.title, area: job.area } : null,
      finalScore,
      classification,
      scoreRows,
      disc,
      responses: candidateResponses.map((r) => ({
        code: r.code,
        stage_label: r.stage_label,
        question_text: r.question_text,
        response_value: r.response_value,
      })),
      notes: notes.map((n) => ({
        author_name: n.author_name,
        created_at: n.created_at,
        content: n.content,
      })),
    });

    if (!ok) {
      toast({
        title: "Pop-up bloqueado",
        description: "Permita pop-ups para este site e tente novamente para gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  const inputClass = "h-9 w-20 rounded-lg border border-input bg-background px-2 text-center text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/candidatos" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm font-bold" />
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 rounded-lg border border-input bg-background px-2 text-sm" />
                <button onClick={handleSaveEdit} className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Salvar</button>
                <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground">Cancelar</button>
              </div>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-foreground">{candidate.name}</h1>
                <p className="text-sm text-muted-foreground">{candidate.email} • {job?.title || "—"}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Candidatou-se em {new Date(candidate.applied_at).toLocaleDateString("pt-BR")} às {new Date(candidate.applied_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="mt-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Etapa do processo</span>
                  <select
                    value={(candidate as any).pipeline_stage || "nova_candidatura"}
                    onChange={(e) => {
                      const val = e.target.value as PipelineStage;
                      if (val === "reprovado") {
                        setPendingStage(val);
                        setShowRejectConfirm(true);
                      } else {
                        moveToStage(val);
                      }
                    }}
                    className="mt-1 block h-8 rounded-lg border border-input bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateResponsesPdf}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              title="Exportar relatório completo do candidato em PDF"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </button>
            {candidate.status !== "approved" && (
              <button
                onClick={() => updateCandidate.mutate({ id: candidate.id, status: "approved" })}
                className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success hover:bg-success/20 transition-colors"
                title="Aprovar"
              >
                <CheckCircle2 className="h-4 w-4" />
                Aprovar
              </button>
            )}
            {candidate.status !== "rejected" && (
              <button
                onClick={() => updateCandidate.mutate({ id: candidate.id, status: "rejected" })}
                className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors"
                title="Reprovar"
              >
                <XCircle className="h-4 w-4" />
                Reprovar
              </button>
            )}
            <button onClick={handleEdit} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Editar">
              <Edit2 className="h-4 w-4" />
            </button>
            <button onClick={() => updateCandidate.mutate({ id: candidate.id, status: "archived" })} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Arquivar">
              <Archive className="h-4 w-4" />
            </button>
            <button onClick={() => setShowDelete(true)} className="rounded-lg p-2 text-destructive hover:bg-destructive/10" title="Excluir">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dados Pessoais */}
        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-display text-base font-bold text-foreground">Dados Pessoais</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Nome</span>
              <p className="text-sm text-foreground">{candidate.name}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">E-mail</span>
              <p className="text-sm text-foreground">{candidate.email}</p>
            </div>
            {candidate.phone && (
              <div>
                <span className="text-xs font-semibold text-muted-foreground">Telefone</span>
                <p className="text-sm text-foreground">{candidate.phone}</p>
              </div>
            )}
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Vaga</span>
              <p className="text-sm text-foreground">{job?.title || "—"} ({job?.area || "—"})</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Status</span>
              <p className={cn("text-sm font-medium capitalize", candidate.status === "approved" ? "text-success" : candidate.status === "rejected" ? "text-destructive" : "text-foreground")}>{candidate.status === "in_progress" ? "Em andamento" : candidate.status === "archived" ? "Arquivado" : candidate.status === "approved" ? "Aprovado" : candidate.status === "rejected" ? "Reprovado" : candidate.status || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Data de candidatura</span>
              <p className="text-sm text-foreground">
                {new Date(candidate.applied_at).toLocaleDateString("pt-BR")} às {new Date(candidate.applied_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-muted-foreground">Consentimento LGPD</span>
              {(candidate as any).lgpd_consent ? (
                <p className="text-sm text-success font-medium">
                  ✓ Concedido em {new Date((candidate as any).lgpd_consent_date).toLocaleDateString("pt-BR")} às {new Date((candidate as any).lgpd_consent_date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Candidatura anterior à política de privacidade
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="mb-6 flex items-center gap-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="text-center">
            <div className="font-display text-4xl font-bold text-foreground">
              {finalScore !== null ? Math.round(finalScore) : "—"}
            </div>
            <span className={cn(
              "inline-block rounded-md px-2 py-0.5 text-xs font-semibold",
              classification === "Forte" ? "bg-success/10 text-foreground" :
              classification === "Desenvolvível" ? "bg-warning/10 text-foreground" :
              classification === "Risco" ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground"
            )}>
              {classification || "Pendente"}
            </span>
          </div>
          <div className="flex-1">
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
              <div className="rounded-md bg-muted p-2 text-center">
                <div className="font-semibold text-foreground">≥ 80</div>
                <div>Forte</div>
              </div>
              <div className="rounded-md bg-muted p-2 text-center">
                <div className="font-semibold text-foreground">70–79</div>
                <div>Desenvolvível</div>
              </div>
              <div className="rounded-md bg-muted p-2 text-center">
                <div className="font-semibold text-foreground">&lt; 70</div>
                <div>Risco</div>
              </div>
              <div className="rounded-md bg-muted p-2 text-center">
                <div className="font-semibold text-foreground">Cultura &lt; {job?.min_culture_score || 60}</div>
                <div>Eliminatório</div>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {candidate.alerts?.length > 0 && (
          <div className="mb-6 space-y-2">
            {candidate.alerts.map((alert, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {alert}
              </div>
            ))}
          </div>
        )}

        {/* CV info */}
        {candidate.cv_url && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4 shadow-card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-sm font-bold text-foreground">Currículo</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCvAction("view")}
                  disabled={cvActionLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 disabled:opacity-50"
                >
                  {cvActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  Ver currículo
                </button>
                <button
                  onClick={() => handleCvAction("download")}
                  disabled={cvActionLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar
                </button>
                <button
                  onClick={handleAnalyzeCv}
                  disabled={analyzingCv}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {analyzingCv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {analyzingCv ? "Analisando..." : "Analisar CV"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CV Analysis */}
        {candidate.cv_analysis && typeof candidate.cv_analysis === "object" && (() => {
          const cvStage = stages.find(s => s.stage_key === "cv_upload");
          const cvWeight = cvStage?.weight ?? 0;
          return (
          <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-foreground">Análise de CV (IA)</h2>
              {cvWeight === 0 && (
                <span className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground">
                  <Info className="h-3 w-3" /> Peso 0 — não afeta o score final
                </span>
              )}
            </div>
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 px-3 py-1.5 text-center">
                <div className="font-display text-2xl font-bold text-foreground">{(candidate.cv_analysis as any).score ?? "—"}</div>
                <div className="text-xs text-muted-foreground">Score CV</div>
              </div>
              <span className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold",
                (candidate.cv_analysis as any).recommendation === "Recomendado" ? "bg-success/10 text-foreground" :
                (candidate.cv_analysis as any).recommendation === "Não Recomendado" ? "bg-destructive/10 text-destructive" :
                "bg-warning/10 text-foreground"
              )}>
                {(candidate.cv_analysis as any).recommendation}
              </span>
            </div>
            {(candidate.cv_analysis as any).summary && (
              <p className="mb-3 text-sm text-muted-foreground">{(candidate.cv_analysis as any).summary}</p>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(candidate.cv_analysis as any).strengths?.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-foreground">Pontos Fortes</h3>
                  <ul className="space-y-1">
                    {(candidate.cv_analysis as any).strengths.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="mt-0.5 text-success">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(candidate.cv_analysis as any).weaknesses?.length > 0 && (
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-foreground">Pontos de Atenção</h3>
                  <ul className="space-y-1">
                    {(candidate.cv_analysis as any).weaknesses.map((w: string, i: number) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <span className="mt-0.5 text-warning">!</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          );
        })()}

        {/* Scores editing */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-4 font-display text-base font-bold text-foreground">Notas por Etapa</h2>
          {scorableStages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma etapa configurada para esta vaga. <Link to={`/vagas/${candidate.job_id}/configurar`} className="text-info hover:underline">Configurar etapas</Link></p>
          ) : (
            <div className="space-y-4">
              {scorableStages.map((stage) => {
                const score = getEvalScore(stage.id);
                return (
                  <div key={stage.id} className="flex items-center gap-4">
                    <div className="w-44">
                      <span className="text-sm text-foreground">{stage.label}</span>
                      <span className="ml-1 text-xs text-muted-foreground">({stage.weight}%)</span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score !== null ? score : ""}
                      placeholder="—"
                      onChange={(e) => handleScoreChange(stage.id, Number(e.target.value))}
                      className={inputClass}
                    />
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            score === null ? "w-0" : (score >= 80 ? "bg-accent" : score >= 60 ? "bg-warning" : "bg-destructive")
                          )}
                          style={{ width: score !== null ? `${score}%` : "0%" }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground">
                      {score !== null ? score : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* DISC */}
        {disc && (
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-foreground">DISC / Temperamento</h2>
            <div className="flex items-center gap-2">
              {disc.file_url && (
                <button
                  onClick={async () => {
                    const { data } = await supabase.storage.from("disc-files").createSignedUrl(disc.file_url!, 600);
                    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80"
                >
                  <Download className="h-3.5 w-3.5" /> Ver PDF DISC
                </button>
              )}
              {(disc.d_score != null || disc.i_score != null) && (
                <button
                  onClick={async () => {
                    setAnalyzingDisc(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("analyze-disc", {
                        body: { candidateId: candidate.id },
                      });
                      if (error) throw error;
                      toast({ title: "Análise DISC concluída", description: `Match: ${data?.match_score ?? "—"}%` });
                      window.location.reload();
                    } catch (e: any) {
                      toast({ title: "Erro na análise DISC", description: e.message, variant: "destructive" });
                    } finally {
                      setAnalyzingDisc(false);
                    }
                  }}
                  disabled={analyzingDisc}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {analyzingDisc ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {analyzingDisc ? "Analisando..." : "Analisar Match"}
                </button>
              )}
            </div>
          </div>

          {/* DISC Scores (read-only) */}
          <div className="mb-4 grid grid-cols-4 gap-3">
            {(["d", "i", "s", "c"] as const).map(key => {
              const discKey = `${key}_score` as "d_score" | "i_score" | "s_score" | "c_score";
              const currentVal = disc?.[discKey];
              return (
                <div key={key} className="rounded-lg bg-muted p-3 text-center">
                  <div className="font-display text-lg font-bold text-foreground">
                    {currentVal != null ? currentVal : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">{key.toUpperCase()}</div>
                </div>
              );
            })}
          </div>

          {/* DISC Analysis summary */}
          {disc?.summary && (
            <div className="rounded-lg bg-muted/50 p-3">
              <h3 className="mb-1 text-xs font-semibold text-foreground">Análise de Match DISC</h3>
              <p className="text-sm text-muted-foreground">{disc.summary}</p>
            </div>
          )}
          {disc?.alerts && disc.alerts.length > 0 && (
            <div className="mt-2 space-y-1">
              {disc.alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {alert}
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Respostas do Candidato */}
        {candidateResponses.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card shadow-card">
           <div className="flex items-center gap-2 p-5">
             <button
               onClick={() => setShowResponses(!showResponses)}
               className="flex flex-1 items-center gap-2 text-left hover:opacity-80 transition-opacity"
             >
               <MessageSquare className="h-4 w-4 text-muted-foreground" />
               <h2 className="font-display text-base font-bold text-foreground">Respostas do Formulário</h2>
               <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{candidateResponses.length} respostas</span>
               <div className="ml-auto">
                 {showResponses ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
               </div>
             </button>
             <button
               onClick={handleGenerateResponsesPdf}
               className="flex items-center gap-1.5 rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
               title="Gerar PDF das respostas"
             >
               <FileText className="h-3.5 w-3.5" />
               Gerar PDF
             </button>
           </div>
            {showResponses && (
              <div className="border-t border-border px-5 pb-5 pt-3">{(() => {
              const grouped = candidateResponses.reduce((acc, r) => {
                if (!acc[r.stage_label]) acc[r.stage_label] = [];
                acc[r.stage_label].push(r);
                return acc;
              }, {} as Record<string, typeof candidateResponses>);

              return Object.entries(grouped).map(([stageLabel, responses]) => (
                <div key={stageLabel} className="mb-4 last:mb-0">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{stageLabel}</h3>
                  <div className="space-y-3">
                    {responses.map((r) => (
                      <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">{r.code}</span>
                          <span className="text-xs font-medium text-foreground">{r.question_text}</span>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {r.response_value ? (() => {
                            const value = r.response_value || "";
                            const urlMatch = value.match(/https?:\/\/\S+/i);
                            const qLower = r.question_text.toLowerCase();
                            const isSocialHandle = /^@?\w+/.test(value) && (qLower.includes("instagram") || qLower.includes("linkedin") || qLower.includes("github"));
                            let href = urlMatch?.[0] || "";
                            if (!href && isSocialHandle) {
                              const handle = value.replace(/^@/, "");
                              if (qLower.includes("instagram")) href = `https://instagram.com/${handle}`;
                              else if (qLower.includes("linkedin")) href = `https://linkedin.com/in/${handle}`;
                              else if (qLower.includes("github")) href = `https://github.com/${handle}`;
                            }
                            return href ? (
                              <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-info hover:underline break-all">
                                <ExternalLink className="h-3 w-3 flex-shrink-0" /> {value}
                              </a>
                            ) : value;
                          })() : <span className="italic">Sem resposta</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}</div>
            )}
          </div>
        )}
        {/* Observações do Recrutador */}
        <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-display text-base font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Observações do Recrutador
          </h2>
          <div className="mb-4">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Adicionar observação sobre a entrevista, comportamento, pontos de atenção..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <button
              onClick={() => {
                if (!noteText.trim() || !user?.id || !id) return;
                addNote.mutate({ candidate_id: id, author_id: user.id, content: noteText.trim() });
                setNoteText("");
              }}
              disabled={!noteText.trim() || addNote.isPending}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              {addNote.isPending ? "Salvando..." : "Adicionar Observação"}
            </button>
          </div>
          {notes.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {notes.map((note) => (
                <div key={note.id} className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{note.author_name || "Recrutador"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString("pt-BR")} às {new Date(note.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada ainda.</p>
          )}
        </div>

        {scorableStages.length > 0 && (
          <div className="mt-6 rounded-xl border border-border bg-card p-5 shadow-card">
            <h2 className="mb-3 font-display text-base font-bold text-foreground">Cálculo do Score Final</h2>
            <div className="space-y-2 text-sm">
              {scorableStages.map((stage) => {
                const score = getEvalScore(stage.id);
                if (score === null) return (
                  <div key={stage.id} className="flex justify-between text-muted-foreground">
                    <span>{stage.label}</span>
                    <span className="italic">Pendente</span>
                  </div>
                );
                const contribution = totalWeight > 0 ? Math.round((score * stage.weight) / totalWeight) : 0;
                return (
                  <div key={stage.id} className="flex justify-between text-muted-foreground">
                    <span>{stage.label}: {score} × {stage.weight}%</span>
                    <span className="font-semibold text-foreground">{contribution}</span>
                  </div>
                );
              })}
              <div className="flex justify-between border-t border-border pt-2 font-bold text-foreground">
                <span>Score Final</span>
                <span>{finalScore !== null ? Math.round(finalScore) : "—"}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir candidato?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRejectConfirm} onOpenChange={setShowRejectConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para Reprovado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja mover {candidate.name} para Reprovado? Essa ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStage(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingStage) moveToStage(pendingStage);
                setShowRejectConfirm(false);
                setPendingStage(null);
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
