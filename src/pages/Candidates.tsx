import AppLayout from "@/components/layout/AppLayout";
import { useCandidates, useDeleteCandidate, useUpdateCandidate } from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Search, Users, Mail, Trash2, Archive, MoreVertical, LayoutList, Columns3 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import KanbanBoard from "@/components/candidates/KanbanBoard";

export default function Candidates() {
  const [searchParams] = useSearchParams();
  const initialClass = searchParams.get("classification") || "all";
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState(initialClass);
  const [jobFilter, setJobFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban">(() => {
    return (localStorage.getItem("candidates-view") as "list" | "kanban") || "kanban";
  });

  useEffect(() => {
    localStorage.setItem("candidates-view", viewMode);
  }, [viewMode]);

  const { data: candidates = [], isLoading } = useCandidates();
  const { data: jobs = [] } = useJobs();
  const deleteCandidate = useDeleteCandidate();
  const updateCandidate = useUpdateCandidate();

  const filtered = candidates.filter((c) => {
    if (c.status === "rejected" || c.status === "approved") return false;
    const job = jobs.find(j => j.id === c.job_id);
    if (filter !== "all" && job?.area !== filter) return false;
    if (classFilter !== "all" && c.classification !== classFilter) return false;
    if (jobFilter !== "all" && c.job_id !== jobFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Candidatos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Pipeline completo de candidatos no processo seletivo</p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar candidato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-input bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todas as vagas</option>
          {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>

        <div className="flex items-center gap-1.5">
          {["all", "Forte", "Desenvolvível", "Risco"].map((cls) => (
            <button
              key={cls}
              onClick={() => setClassFilter(cls)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                classFilter === cls ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {cls === "all" ? "Todos" : cls}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            title="Visão lista"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("kanban")}
            className={cn("rounded-md p-1.5 transition-colors", viewMode === "kanban" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            title="Visão kanban"
          >
            <Columns3 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando candidatos...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Nenhum candidato encontrado</p>
          <p className="mt-1 text-xs text-muted-foreground">Divulgue o link da vaga para receber candidaturas</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard candidates={filtered} jobs={jobs} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const job = jobs.find(j => j.id === c.job_id);
            return (
              <div key={c.id} className="group relative rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover">
                <Link to={`/candidatos/${c.id}`} className="block">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-bold text-foreground">{c.name}</h3>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />{c.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-xl font-bold text-foreground">
                        {c.final_score !== null ? Math.round(c.final_score) : "—"}
                      </div>
                      <span className={cn(
                        "inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                        c.classification === "Forte" ? "bg-success/10 text-foreground" :
                        c.classification === "Desenvolvível" ? "bg-warning/10 text-foreground" :
                        c.classification === "Risco" ? "bg-destructive/10 text-destructive" :
                        "bg-muted text-muted-foreground"
                      )}>
                        {c.classification || "Pendente"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{job?.title || "—"}</span>
                    <span>{new Date(c.applied_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                </Link>
                <div className="absolute right-2 top-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => updateCandidate.mutate({ id: c.id, status: "archived" })}>
                        <Archive className="mr-2 h-3.5 w-3.5" /> Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita. O candidato e todas as suas respostas serão excluídos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteId) deleteCandidate.mutate(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
