import { PIPELINE_STAGES, DbCandidate } from "@/hooks/useCandidates";

interface Props {
  candidates: DbCandidate[];
}

export default function FunnelVelocity({ candidates }: Props) {
  // Estimativa: como ainda não guardamos o histórico de transições de etapa,
  // aproximamos o tempo "parado" pela diferença entre agora e updated_at do
  // candidato que está atualmente na etapa. É uma aproximação, não o tempo real.
  const stageData = PIPELINE_STAGES.filter(s => s.key !== "nova_candidatura" && s.key !== "reprovado").map((stage) => {
    const inStage = candidates.filter(c => c.pipeline_stage === stage.key);
    if (inStage.length === 0) return { label: stage.label, avgDays: null };
    
    const now = Date.now();
    const totalDays = inStage.reduce((sum, c) => {
      const days = Math.floor((now - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    const avgDays = Math.round(totalDays / inStage.length);
    return { label: stage.label, avgDays };
  });

  const barColor = (days: number) => {
    if (days <= 3) return "#22C55E";
    if (days <= 7) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-foreground">Velocidade do Funil</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Estimativa de tempo parado em cada etapa (pela última atualização)</p>
      <div className="mt-4 space-y-3">
        {stageData.map((s) => (
          <div key={s.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] text-foreground">{s.label}</span>
              {s.avgDays !== null ? (
                <span className="text-[13px] font-bold" style={{ color: barColor(s.avgDays) }}>
                  {s.avgDays}d
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">Dados insuficientes</span>
              )}
            </div>
            {s.avgDays !== null && (
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((s.avgDays / 14) * 100, 100)}%`,
                    backgroundColor: barColor(s.avgDays),
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
