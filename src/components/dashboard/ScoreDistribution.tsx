import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, LabelList } from "recharts";
import { DbCandidate } from "@/hooks/useCandidates";

interface Props {
  candidates: DbCandidate[];
}

export default function ScoreDistribution({ candidates }: Props) {
  const scoredCandidates = candidates.filter((c) => c.final_score !== null);
  const avgScore = scoredCandidates.length > 0
    ? Math.round(scoredCandidates.reduce((s, c) => s + (c.final_score || 0), 0) / scoredCandidates.length)
    : null;

  const scoreBuckets = [
    { range: "0–59", min: 0, max: 59 },
    { range: "60–69", min: 60, max: 69 },
    { range: "70–79", min: 70, max: 79 },
    { range: "80–89", min: 80, max: 89 },
    { range: "90–100", min: 90, max: 100 },
  ];

  const scoreDistribution = scoreBuckets.map((b) => ({
    ...b,
    count: scoredCandidates.filter((c) => (c.final_score || 0) >= b.min && (c.final_score || 0) <= b.max).length,
    color: b.max <= 69 ? "#EF4444" : "#0D2E2A",
  }));

  const redCount = scoreDistribution.filter(b => b.color === "#EF4444").reduce((s, b) => s + b.count, 0);
  const greenCount = scoreDistribution.filter(b => b.color === "#0D2E2A").reduce((s, b) => s + b.count, 0);
  const total = scoredCandidates.length;
  const redPct = total > 0 ? (redCount / total) * 100 : 0;
  const greenPct = total > 0 ? (greenCount / total) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-display text-base font-bold text-foreground">Distribuição de Scores</h2>
        {avgScore !== null && (
          <span className="text-xs text-muted-foreground">Média: <span className="font-bold text-foreground">{avgScore}</span></span>
        )}
      </div>
      {scoredCandidates.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Sem candidatos avaliados ainda</p>
      ) : (
        <>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreDistribution} barCategoryGap="20%">
                <XAxis dataKey="range" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis hide allowDecimals={false} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 600 }} />
                  {scoreDistribution.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className={`mt-2 text-xs ${redPct > 60 ? "text-warning" : greenPct > 60 ? "text-success" : "text-muted-foreground"}`}>
            {redPct > 60
              ? "⚠ A maior parte dos candidatos está abaixo de 70. Avalie os canais de divulgação."
              : greenPct > 60
                ? "✓ Funil saudável — maioria dos candidatos acima de 70."
                : `${redCount} candidato(s) abaixo de 70 · ${greenCount} acima de 70`}
          </p>
        </>
      )}
    </div>
  );
}
