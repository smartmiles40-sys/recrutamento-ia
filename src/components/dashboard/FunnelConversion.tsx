import { cn } from "@/lib/utils";
import { DbCandidate } from "@/hooks/useCandidates";
import { ArrowDown } from "lucide-react";

interface Props {
  candidates: DbCandidate[];
}

const FUNNEL_STEPS = [
  { key: "nova_candidatura", label: "Candidaturas" },
  { key: "em_analise", label: "Em Análise" },
  { key: "aprovado_entrevista", label: "Aprovados p/ Entrevista" },
  { key: "entrevista_agendada", label: "Em Entrevista" },
  { key: "contratado", label: "Contratados" },
] as const;

export default function FunnelConversion({ candidates }: Props) {
  // Count candidates at or beyond each stage
  const stageOrder = [
    "nova_candidatura", "em_analise", "aprovado_entrevista",
    "entrevista_agendada", "entrevista_realizada", "proposta_enviada", "contratado"
  ];

  const getStageIndex = (stage: string) => stageOrder.indexOf(stage);

  // For funnel, count candidates who reached at least this stage (current or beyond, excluding reprovado for flow)
  const funnelCounts = FUNNEL_STEPS.map((step) => {
    const stepIdx = getStageIndex(step.key);
    const count = candidates.filter(c => {
      if (c.pipeline_stage === "reprovado") {
        // Include reprovados in the stages they passed through — but we can't know that without history
        // So just count current positions
        return false;
      }
      return getStageIndex(c.pipeline_stage) >= stepIdx;
    }).length;
    return { ...step, count };
  });

  const conversionColor = (pct: number) => {
    if (pct >= 20) return "text-success";
    if (pct >= 10) return "text-warning";
    return "text-destructive";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-foreground">Conversão do Funil</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Quantos candidatos avançam em cada etapa</p>
      <div className="mt-4 space-y-1">
        {funnelCounts.map((step, i) => {
          const isLast = i === funnelCounts.length - 1;
          const nextCount = !isLast ? funnelCounts[i + 1].count : null;
          const convPct = step.count > 0 && nextCount !== null
            ? Math.round((nextCount / step.count) * 100)
            : null;

          return (
            <div key={step.key}>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                <span className="text-[22px] font-bold text-foreground">{step.count}</span>
                <span className="text-[13px] text-muted-foreground">{step.label}</span>
              </div>
              {!isLast && (
                <div className="flex items-center gap-1.5 pl-4 py-1">
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
                  {convPct !== null ? (
                    <span className={cn("text-xs font-semibold", conversionColor(convPct))}>
                      {convPct}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
