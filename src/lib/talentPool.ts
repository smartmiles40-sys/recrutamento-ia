// Regras do Banco de Talentos.
//
// Uma vaga de banco de talentos é um guarda-chuva: o candidato escolhe a área
// de interesse e escreve o cargo que busca, e o formulário mostra apenas os
// blocos daquela área. Estas funções decidem quem responde o quê e quanto pesa
// cada área — ficam aqui, fora dos componentes, para poderem ser testadas.

export interface AreaScopedStage {
  /** Bloco exclusivo de uma área. null = comum a todos os candidatos. */
  area?: string | null;
  is_enabled?: boolean;
  weight?: number;
}

/**
 * Um bloco aparece para o candidato quando a vaga não é banco de talentos,
 * quando o bloco não tem área (comum a todos), ou quando o bloco é da área que
 * o candidato escolheu.
 *
 * Enquanto o candidato não escolhe uma área, só os blocos comuns aparecem.
 */
export function stageMatchesArea(
  stage: AreaScopedStage,
  opts: { isTalentPool: boolean; chosenArea: string }
): boolean {
  if (!opts.isTalentPool) return true;
  if (!stage.area) return true;
  return stage.area === opts.chosenArea;
}

/**
 * Peso que cada área soma para o candidato: os blocos comuns mais os blocos
 * exclusivos daquela área. É esse número que precisa fechar 100% — a soma geral
 * de todos os blocos passa de 100% num banco de talentos e não significa nada.
 */
export function weightByArea(
  stages: AreaScopedStage[],
  areas: string[]
): { area: string; weight: number }[] {
  const enabled = stages.filter((s) => s.is_enabled !== false);
  const sum = (list: AreaScopedStage[]) => list.reduce((total, s) => total + (s.weight ?? 0), 0);
  const commonWeight = sum(enabled.filter((s) => !s.area));

  return areas.map((area) => ({
    area,
    weight: commonWeight + sum(enabled.filter((s) => s.area === area)),
  }));
}
