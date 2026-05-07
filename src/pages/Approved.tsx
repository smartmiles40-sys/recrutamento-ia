import AppLayout from "@/components/layout/AppLayout";
import { useCandidates } from "@/hooks/useCandidates";
import { useJobs } from "@/hooks/useJobs";
import { useState } from "react";
import { Search, UserCheck, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Approved() {
  const [search, setSearch] = useState("");
  const [jobFilter, setJobFilter] = useState("all");
  const { data: candidates = [], isLoading } = useCandidates();
  const { data: jobs = [] } = useJobs();

  const approved = candidates
    .filter((c) => c.status === "approved")
    .filter((c) => {
      if (jobFilter !== "all" && c.job_id !== jobFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Aprovados</h1>
        <p className="mt-1 text-sm text-muted-foreground">Candidatos aprovados no processo seletivo</p>
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
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>{j.title}</option>
          ))}
        </select>
        <span className="ml-auto rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-foreground">
          {approved.length} aprovado{approved.length !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground">Carregando...</div>
      ) : approved.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center shadow-card">
          <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">Nenhum candidato aprovado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {approved.map((c) => {
            const job = jobs.find((j) => j.id === c.job_id);
            return (
              <Link
                key={c.id}
                to={`/candidatos/${c.id}`}
                className="rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 font-display text-sm font-bold text-foreground">
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
                    <span className="inline-block rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-foreground">
                      Aprovado
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{job?.title || "—"}</span>
                  <span>{new Date(c.applied_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
