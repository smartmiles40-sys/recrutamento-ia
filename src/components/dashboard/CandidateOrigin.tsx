import { cn } from "@/lib/utils";
import { DbCandidate } from "@/hooks/useCandidates";

interface Props {
  responses: { candidate_id: string; response_value: string | null }[];
  candidates: DbCandidate[];
}

const CHANNEL_MAP: Record<string, string> = {
  linkedin: "LinkedIn", "linked in": "LinkedIn", "linked-in": "LinkedIn",
  instagram: "Instagram", insta: "Instagram",
  panrotas: "Panrotas", panroras: "Panrotas", "panrotas.": "Panrotas", panrota: "Panrotas",
  catho: "Catho", "plataforma da catho": "Catho", "catho.com": "Catho",
  whatsapp: "WhatsApp", whats: "WhatsApp", "whats app": "WhatsApp", zap: "WhatsApp",
  "indicação": "Indicação", indicacao: "Indicação", "indicação de amigo": "Indicação", "fui indicado": "Indicação",
  google: "Google", "pesquisa google": "Google", "busca google": "Google",
  facebook: "Facebook",
  indeed: "Indeed",
  site: "Site",
};

function normalizeChannel(raw: string): string {
  const lower = raw.toLowerCase().trim().replace(/[.,;!?]+$/, "").trim();
  if (!lower || lower.length < 2) return "Outros";
  if (CHANNEL_MAP[lower]) return CHANNEL_MAP[lower];
  // Partial match
  for (const [key, value] of Object.entries(CHANNEL_MAP)) {
    if (lower.includes(key)) return value;
  }
  return "Outros";
}

export default function CandidateOrigin({ responses, candidates }: Props) {
  const scoreMap = new Map(candidates.map((c) => [c.id, c.final_score]));
  const channelMap = new Map<string, { count: number; totalScore: number; scoredCount: number }>();

  responses.forEach((r) => {
    if (!r.response_value) return;
    const channel = normalizeChannel(r.response_value);
    const existing = channelMap.get(channel) || { count: 0, totalScore: 0, scoredCount: 0 };
    existing.count++;
    const score = scoreMap.get(r.candidate_id);
    if (score !== null && score !== undefined) {
      existing.totalScore += score;
      existing.scoredCount++;
    }
    channelMap.set(channel, existing);
  });

  const originData = Array.from(channelMap.entries())
    .map(([channel, d]) => ({
      channel,
      count: d.count,
      avgScore: d.scoredCount > 0 ? Math.round(d.totalScore / d.scoredCount) : null,
    }))
    .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));

  if (originData.length === 0) return null;

  const barColor = (score: number | null) => {
    if (score === null) return "#6B7280";
    if (score >= 70) return "#0D2E2A";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-bold text-foreground">Origem dos Candidatos</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">Qual canal traz mais qualidade — não só volume</p>
      <div className="mt-4 rounded-xl border border-border bg-card p-5 shadow-card space-y-3">
        {originData.map((row) => (
          <div key={row.channel}>
            <div className="flex items-center gap-3">
              <div className="w-24 shrink-0">
                <p className="text-[13px] font-medium text-foreground">{row.channel}</p>
                <p className="text-[11px] text-muted-foreground">{row.count} candidato{row.count !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((row.avgScore || 0), 100)}%`,
                    backgroundColor: barColor(row.avgScore),
                  }}
                />
              </div>
              <span
                className="w-8 text-right text-[13px] font-medium"
                style={{ color: barColor(row.avgScore) }}
              >
                {row.avgScore ?? "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
