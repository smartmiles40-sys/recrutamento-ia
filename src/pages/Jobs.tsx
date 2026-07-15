import AppLayout from "@/components/layout/AppLayout";
import { useJobs, useCreateJob, useDeleteJob, useUpdateJob, useDuplicateJob } from "@/hooks/useJobs";
import { Plus, Copy, Settings, ChevronRight, Users, Calendar, Trash2, Archive, MoreVertical, CopyPlus, ExternalLink } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCandidates } from "@/hooks/useCandidates";
import { useAreaNames } from "@/hooks/useAreas";

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-foreground border-success/20",
  draft: "bg-muted text-muted-foreground border-border",
  closed: "bg-destructive/10 text-destructive border-destructive/20",
  archived: "bg-muted text-muted-foreground border-border",
};
const statusLabels: Record<string, string> = {
  active: "Ativa", draft: "Rascunho", closed: "Encerrada", archived: "Arquivada",
};

export default function Jobs() {
  const [filter, setFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newIsTalentPool, setNewIsTalentPool] = useState(false);
  const [newPoolAreas, setNewPoolAreas] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: jobs = [], isLoading } = useJobs();
  const { data: candidates = [] } = useCandidates();
  const { data: AREAS = [] } = useAreaNames();
  const createJob = useCreateJob();
  const deleteJob = useDeleteJob();
  const updateJob = useUpdateJob();
  const duplicateJob = useDuplicateJob();

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.area === filter);
  const candidateCount = (jobId: string) => candidates.filter(c => c.job_id === jobId).length;

  // Areas come from the database, so default only once they have loaded.
  const selectedArea = newArea || AREAS[0] || "";

  const togglePoolArea = (area: string) =>
    setNewPoolAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]));

  const handleCreate = () => {
    if (!newTitle.trim() || !selectedArea) return;
    createJob.mutate({
      title: newTitle.trim(),
      area: selectedArea,
      status: "draft",
      created_by: user?.id,
      is_talent_pool: newIsTalentPool,
      // Empty = offer every active area to the candidate.
      talent_pool_areas: newIsTalentPool ? newPoolAreas : [],
      ...(newIsTalentPool ? { intro_title: "Banco de Talentos" } : {}),
    } as any);
    setNewTitle("");
    setNewIsTalentPool(false);
    setNewPoolAreas([]);
    setShowCreate(false);
  };

  const handleCopyLink = (e: React.MouseEvent, jobId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const link = `${window.location.origin}/aplicar/${jobId}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!", description: link });
  };

  const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <AppLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Vagas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gerencie as vagas e configure o processo seletivo</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/vagas-abertas"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Página Pública
          </a>
          <button
            onClick={() => {
              const link = `${window.location.origin}/vagas-abertas`;
              navigator.clipboard.writeText(link);
              toast({ title: "Link do catálogo copiado!", description: link });
            }}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            <Copy className="h-4 w-4" />
            Copiar Catálogo
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Nova Vaga
          </button>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-card animate-fade-in">
          <h2 className="mb-4 font-display text-base font-bold text-foreground">Criar Nova Vaga</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Título da Vaga</label>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputClass} placeholder="Ex: SDR - Sales Development" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Área</label>
              <select value={selectedArea} onChange={(e) => setNewArea(e.target.value)} className={inputClass}>
                {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          {/* Talent pool */}
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={newIsTalentPool}
                onChange={(e) => setNewIsTalentPool(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">É um Banco de Talentos</span>
                <span className="block text-xs text-muted-foreground">
                  O candidato escolhe a área de interesse e escreve o cargo que busca. As perguntas mudam conforme a área escolhida.
                </span>
              </span>
            </label>

            {newIsTalentPool && (
              <div className="mt-3 border-t border-border pt-3">
                <label className="mb-1.5 block text-sm font-medium text-foreground">Áreas oferecidas ao candidato</label>
                <p className="mb-2 text-xs text-muted-foreground">
                  {newPoolAreas.length === 0 ? "Nenhuma marcada — todas as áreas serão oferecidas." : `${newPoolAreas.length} área(s) marcada(s).`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {AREAS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => togglePoolArea(a)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        newPoolAreas.includes(a)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={handleCreate} disabled={!newTitle.trim() || !selectedArea || createJob.isPending} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {createJob.isPending ? "Criando..." : "Criar Vaga"}
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">Cancelar</button>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center gap-2">
        <button onClick={() => setFilter("all")} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>Todas</button>
        {AREAS.map((area) => (
          <button key={area} onClick={() => setFilter(area)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", filter === area ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{area}</button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando vagas...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Nenhuma vaga encontrada</p>
          <p className="mt-1 text-xs text-muted-foreground">Clique em "Nova Vaga" para criar uma</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <div key={job.id} className="group relative rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover">
              <Link to={`/vagas/${job.id}/configurar`} className="block">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-bold text-foreground">{job.title}</h3>
                      <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold", statusStyles[job.status] || statusStyles.draft)}>
                        {statusLabels[job.status] || job.status}
                      </span>
                      {job.is_talent_pool && (
                        <span className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                          Banco de Talentos
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {job.is_talent_pool
                        ? (job.talent_pool_areas?.length ? job.talent_pool_areas.join(" • ") : "Todas as áreas")
                        : job.area}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(job.required_skills || []).slice(0, 4).map((skill) => (
                    <span key={skill} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground/70">{skill}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{candidateCount(job.id)} candidatos</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(job.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </Link>
              <div className="absolute right-3 bottom-3 flex items-center gap-1">
                <button onClick={(e) => handleCopyLink(e, job.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Copiar link">
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => duplicateJob.mutate(job.id)}>
                      <CopyPlus className="mr-2 h-3.5 w-3.5" /> Duplicar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateJob.mutate({ id: job.id, status: job.status === "active" ? "draft" : "active" })}>
                      {job.status === "active" ? "Desativar" : "Ativar"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateJob.mutate({ id: job.id, status: "archived" })}>
                      <Archive className="mr-2 h-3.5 w-3.5" /> Arquivar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(job.id)}>
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. Todos os candidatos vinculados a esta vaga serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteJob.mutate(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
