import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CulturalTechnicalItem {
  title: string;
  cultural: number | null;
  technical: number | null;
}

interface Props {
  data: CulturalTechnicalItem[];
}

export default function CulturalTechnical({ data }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="font-display text-base font-bold text-foreground">Fit Cultural vs. Técnico</h2>
      <div className="mt-4 space-y-4">
        {data.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma vaga ativa</p>
        )}
        {data.map((item) => {
          const diff = item.cultural !== null && item.technical !== null
            ? Math.abs(item.cultural - item.technical)
            : 0;
          const lower = item.cultural !== null && item.technical !== null
            ? (item.cultural < item.technical ? "cultural" : item.technical < item.cultural ? "technical" : null)
            : null;

          const getColor = (field: "cultural" | "technical") => {
            if (item.cultural === null || item.technical === null) return "text-foreground";
            if (diff < 15) return "text-primary";
            if (field === lower) {
              return diff >= 25 ? "text-destructive" : "text-warning";
            }
            return "text-primary";
          };

          const showWarning = (field: "cultural" | "technical") => {
            if (diff < 15 || field !== lower) return false;
            return true;
          };

          return (
            <div key={item.title} className="flex items-center gap-4">
              <p className="w-36 text-[13px] font-medium text-primary truncate">{item.title}</p>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="block text-[10px] uppercase text-muted-foreground">Cultural</span>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-[22px] font-medium", getColor("cultural"))}>
                      {item.cultural ?? "—"}
                    </span>
                    {showWarning("cultural") && (
                      <AlertTriangle className={cn("h-3.5 w-3.5", diff >= 25 ? "text-destructive" : "text-warning")} />
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <span className="block text-[10px] uppercase text-muted-foreground">Técnico</span>
                  <div className="flex items-center gap-1">
                    <span className={cn("text-[22px] font-medium", getColor("technical"))}>
                      {item.technical ?? "—"}
                    </span>
                    {showWarning("technical") && (
                      <AlertTriangle className={cn("h-3.5 w-3.5", diff >= 25 ? "text-destructive" : "text-warning")} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Cultural = média do Bloco F · Técnico = média dos Blocos B+C+D
      </p>
    </div>
  );
}
