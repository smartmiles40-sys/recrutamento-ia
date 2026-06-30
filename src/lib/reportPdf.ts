// Geração de PDF via "imprimir para PDF" do navegador (sem dependências extras).
// Todo conteúdo vindo de candidato/recrutador passa por escapeHtml() para evitar
// injeção de HTML/script na janela de impressão.

/* ─────────────────────────── Marca ─────────────────────────── */
const BRAND = {
  dark: "#0D2E2A", // verde-petróleo escuro
  darkSoft: "#16403B",
  accent: "#CBEF6E", // verde-limão
  ink: "#0D2E2A",
  body: "#3F4F4D",
  muted: "#7A8A89",
  line: "#E5E9E7",
  bgSoft: "#F4F6F4",
  danger: "#C0392B",
  warn: "#B7791F",
  ok: "#1E8E5A",
};

/* ───────────────────────── Utilitários ──────────────────────── */

/** Escapa caracteres perigosos para interpolar texto do usuário em HTML. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Texto com quebras de linha → HTML escapado preservando os \n. */
function nl2brEscaped(value: unknown): string {
  return escapeHtml(value).replace(/\n/g, "<br/>");
}

function absoluteUrl(src: string): string {
  try {
    return new URL(src, window.location.origin).href;
  } catch {
    return src;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/* ──────────────────── Documento base / impressão ──────────────────── */

interface DocOptions {
  title: string;
  /** Texto pequeno no topo (ex.: "Relatório de Candidato"). */
  kicker: string;
  /** Título grande do documento. */
  heading: string;
  /** Subtítulo abaixo do título grande. */
  subheading?: string;
  /** URL absoluta da logo (opcional). */
  logoUrl?: string;
  bodyHtml: string;
}

function renderDocument(opts: DocOptions): string {
  const logo = opts.logoUrl
    ? `<img src="${escapeHtml(opts.logoUrl)}" alt="Logo" style="height:30px;object-fit:contain;filter:brightness(0) invert(1);" />`
    : `<span style="color:#fff;font-weight:700;font-size:15px;letter-spacing:.04em;">Se Tu For, Eu Vou!</span>`;

  return `<!DOCTYPE html>
<html lang="pt-BR"><head>
<meta charset="utf-8" />
<title>${escapeHtml(opts.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    color: ${BRAND.body};
    background: #fff;
    font-size: 12px;
    line-height: 1.5;
  }
  .page { max-width: 800px; margin: 0 auto; padding: 0 32px 40px; }
  h1, h2, h3 { font-family: 'Space Grotesk', 'Inter', sans-serif; color: ${BRAND.ink}; margin: 0; }

  .topbar {
    background: ${BRAND.dark};
    padding: 18px 32px;
    display: flex; align-items: center; justify-content: space-between;
    border-bottom: 3px solid ${BRAND.accent};
  }
  .topbar .kicker { color: rgba(255,255,255,.6); font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }

  .doc-head { padding: 26px 0 18px; border-bottom: 1px solid ${BRAND.line}; margin-bottom: 22px; }
  .doc-head h1 { font-size: 24px; line-height: 1.2; }
  .doc-head .sub { color: ${BRAND.muted}; font-size: 12.5px; margin-top: 6px; }

  .section { margin-bottom: 22px; page-break-inside: avoid; }
  .section > h2 {
    font-size: 13px; text-transform: uppercase; letter-spacing: .08em;
    color: ${BRAND.dark}; padding-bottom: 6px; margin-bottom: 12px;
    border-bottom: 2px solid ${BRAND.bgSoft};
  }

  .card { border: 1px solid ${BRAND.line}; border-radius: 10px; padding: 14px 16px; background: #fff; page-break-inside: avoid; }
  .card + .card { margin-top: 10px; }

  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; }
  .field .label { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: ${BRAND.muted}; }
  .field .value { font-size: 12.5px; color: ${BRAND.ink}; font-weight: 500; margin-top: 1px; }

  .pill { display: inline-block; border-radius: 999px; padding: 3px 11px; font-size: 11px; font-weight: 600; }
  .chip { display: inline-block; border-radius: 6px; padding: 3px 10px; font-size: 11px; font-weight: 500; background: ${BRAND.bgSoft}; color: ${BRAND.dark}; margin: 0 5px 5px 0; }

  .scorebox { display: flex; align-items: center; gap: 18px; background: ${BRAND.dark}; border-radius: 14px; padding: 18px 22px; color: #fff; }
  .scorebox .num { font-family: 'Space Grotesk', sans-serif; font-size: 46px; font-weight: 700; line-height: 1; color: #fff; }
  .scorebox .num small { font-size: 16px; color: rgba(255,255,255,.55); font-weight: 500; }

  table.bd { width: 100%; border-collapse: collapse; }
  table.bd th, table.bd td { text-align: left; padding: 8px 10px; border-bottom: 1px solid ${BRAND.line}; font-size: 11.5px; }
  table.bd th { color: ${BRAND.muted}; text-transform: uppercase; letter-spacing: .05em; font-size: 9.5px; }
  table.bd td.r, table.bd th.r { text-align: right; }
  table.bd tr.total td { font-weight: 700; color: ${BRAND.ink}; border-top: 2px solid ${BRAND.dark}; border-bottom: none; }

  .disc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .disc-grid .cell { border: 1px solid ${BRAND.line}; border-radius: 10px; text-align: center; padding: 10px 4px; }
  .disc-grid .cell .v { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; color: ${BRAND.ink}; }
  .disc-grid .cell .k { font-size: 10px; color: ${BRAND.muted}; margin-top: 2px; }

  .qa { border: 1px solid ${BRAND.line}; border-left: 3px solid ${BRAND.accent}; border-radius: 8px; padding: 9px 12px; margin-bottom: 8px; page-break-inside: avoid; }
  .qa .q { font-size: 11.5px; font-weight: 600; color: ${BRAND.ink}; }
  .qa .a { font-size: 12px; color: ${BRAND.body}; margin-top: 3px; }
  .qa .code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 9px; font-weight: 700; color: ${BRAND.dark}; background: ${BRAND.bgSoft}; border-radius: 4px; padding: 1px 5px; margin-right: 6px; }

  .alert { border-radius: 8px; padding: 8px 12px; font-size: 11.5px; margin-bottom: 6px; background: rgba(192,57,43,.06); color: ${BRAND.danger}; border: 1px solid rgba(192,57,43,.18); }
  ul.clean { margin: 4px 0 0; padding-left: 16px; }
  ul.clean li { font-size: 11.5px; margin-bottom: 3px; }

  .stage-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid ${BRAND.line}; }
  .stage-row:last-child { border-bottom: none; }
  .stage-row .idx { flex: 0 0 22px; height: 22px; border-radius: 6px; background: ${BRAND.dark}; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .stage-row .nm { flex: 1; font-weight: 600; color: ${BRAND.ink}; font-size: 12.5px; }

  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid ${BRAND.line}; display: flex; justify-content: space-between; color: ${BRAND.muted}; font-size: 10px; }

  @page { margin: 14mm 0; }
  @media print { .topbar { position: running(header); } a { color: ${BRAND.dark}; text-decoration: none; } }
</style>
</head>
<body>
  <div class="topbar">
    ${logo}
    <span class="kicker">${escapeHtml(opts.kicker)}</span>
  </div>
  <div class="page">
    <div class="doc-head">
      <h1>${escapeHtml(opts.heading)}</h1>
      ${opts.subheading ? `<div class="sub">${escapeHtml(opts.subheading)}</div>` : ""}
    </div>
    ${opts.bodyHtml}
    <div class="footer">
      <span>Se Tu For, Eu Vou! Viagens — Recrutamento &amp; Seleção</span>
      <span>Gerado em ${formatDateTime(new Date().toISOString())}</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', function () {
      setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 350);
    });
  </script>
</body></html>`;
}

/**
 * Abre o documento em nova janela e dispara a impressão.
 * Retorna false se a janela foi bloqueada (pop-up blocker) — o chamador deve avisar o usuário.
 */
function printDocument(html: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}

/* ─────────────────────── Relatório de Candidato ─────────────────────── */

export interface CandidateReportData {
  logoSrc?: string;
  candidate: {
    name: string;
    email: string;
    phone?: string | null;
    applied_at: string;
    status?: string | null;
    pipeline_stage?: string | null;
    pipeline_label?: string | null;
    lgpd_consent?: boolean | null;
    lgpd_consent_date?: string | null;
    alerts?: string[] | null;
    cv_analysis?: any;
  };
  job?: { title?: string | null; area?: string | null } | null;
  finalScore: number | null;
  classification: string | null;
  scoreRows: { label: string; weight: number; score: number | null; contribution: number | null }[];
  disc?: {
    d_score?: number | null; i_score?: number | null; s_score?: number | null; c_score?: number | null;
    summary?: string | null; alerts?: string[] | null;
  } | null;
  responses: { code: string; stage_label: string; question_text: string; response_value: string | null }[];
  notes?: { author_name?: string | null; created_at: string; content: string }[];
}

function statusLabel(status?: string | null): string {
  switch (status) {
    case "approved": return "Aprovado";
    case "rejected": return "Reprovado";
    case "archived": return "Arquivado";
    case "in_progress": return "Em andamento";
    default: return status || "—";
  }
}

function classificationPill(classification: string | null): string {
  if (!classification) return `<span class="pill" style="background:${BRAND.bgSoft};color:${BRAND.muted};">Pendente</span>`;
  const map: Record<string, string> = {
    Forte: `background:rgba(30,142,90,.14);color:${BRAND.ok};`,
    Desenvolvível: `background:rgba(183,121,31,.14);color:${BRAND.warn};`,
    Risco: `background:rgba(192,57,43,.12);color:${BRAND.danger};`,
  };
  return `<span class="pill" style="${map[classification] || `background:${BRAND.bgSoft};color:${BRAND.muted};`}">${escapeHtml(classification)}</span>`;
}

export function generateCandidateReport(data: CandidateReportData): boolean {
  const c = data.candidate;
  const logoUrl = data.logoSrc ? absoluteUrl(data.logoSrc) : undefined;

  // Score
  const scoreSection = `
    <div class="section">
      <div class="scorebox">
        <div>
          <div class="num">${data.finalScore !== null ? Math.round(data.finalScore) : "—"}<small> / 100</small></div>
        </div>
        <div style="flex:1;">
          <div style="color:rgba(255,255,255,.6);font-size:10px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:5px;">Score Final</div>
          ${classificationPill(data.classification)}
          <div style="color:rgba(255,255,255,.55);font-size:10px;margin-top:8px;">Forte ≥ 80 · Desenvolvível 70–79 · Risco &lt; 70</div>
        </div>
      </div>
    </div>`;

  // Dados pessoais
  const personal = `
    <div class="section">
      <h2>Dados do Candidato</h2>
      <div class="card">
        <div class="grid2">
          <div class="field"><div class="label">Nome</div><div class="value">${escapeHtml(c.name)}</div></div>
          <div class="field"><div class="label">E-mail</div><div class="value">${escapeHtml(c.email)}</div></div>
          <div class="field"><div class="label">Telefone</div><div class="value">${escapeHtml(c.phone || "—")}</div></div>
          <div class="field"><div class="label">Vaga</div><div class="value">${escapeHtml(data.job?.title || "—")}${data.job?.area ? ` (${escapeHtml(data.job.area)})` : ""}</div></div>
          <div class="field"><div class="label">Status</div><div class="value">${escapeHtml(statusLabel(c.status))}</div></div>
          <div class="field"><div class="label">Etapa do processo</div><div class="value">${escapeHtml(c.pipeline_label || "—")}</div></div>
          <div class="field"><div class="label">Candidatura</div><div class="value">${formatDateTime(c.applied_at)}</div></div>
          <div class="field"><div class="label">Consentimento LGPD</div><div class="value">${c.lgpd_consent ? `✓ ${formatDate(c.lgpd_consent_date)}` : "Não registrado"}</div></div>
        </div>
      </div>
    </div>`;

  // Alertas
  const alerts = (c.alerts && c.alerts.length)
    ? `<div class="section"><h2>Alertas</h2>${c.alerts.map(a => `<div class="alert">⚠ ${escapeHtml(a)}</div>`).join("")}</div>`
    : "";

  // Breakdown de score
  const scorable = data.scoreRows.length > 0;
  const breakdown = scorable ? `
    <div class="section">
      <h2>Notas por Etapa</h2>
      <div class="card" style="padding:4px 14px;">
        <table class="bd">
          <thead><tr><th>Etapa</th><th class="r">Nota</th><th class="r">Peso</th><th class="r">Contribuição</th></tr></thead>
          <tbody>
            ${data.scoreRows.map(r => `
              <tr>
                <td>${escapeHtml(r.label)}</td>
                <td class="r">${r.score !== null ? r.score : "—"}</td>
                <td class="r">${r.weight}%</td>
                <td class="r">${r.contribution !== null ? r.contribution : "—"}</td>
              </tr>`).join("")}
            <tr class="total"><td>Score Final</td><td class="r"></td><td class="r"></td><td class="r">${data.finalScore !== null ? Math.round(data.finalScore) : "—"}</td></tr>
          </tbody>
        </table>
      </div>
    </div>` : "";

  // CV Analysis
  const cv = c.cv_analysis && typeof c.cv_analysis === "object" ? c.cv_analysis : null;
  const cvSection = cv ? `
    <div class="section">
      <h2>Análise de Currículo (IA)</h2>
      <div class="card">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px;">
          <span style="font-family:'Space Grotesk',sans-serif;font-size:28px;font-weight:700;color:${BRAND.ink};">${escapeHtml(cv.score ?? "—")}</span>
          <span class="pill" style="background:${BRAND.bgSoft};color:${BRAND.dark};">${escapeHtml(cv.recommendation || "—")}</span>
        </div>
        ${cv.summary ? `<p style="margin:0 0 8px;color:${BRAND.body};">${nl2brEscaped(cv.summary)}</p>` : ""}
        <div class="grid2">
          ${Array.isArray(cv.strengths) && cv.strengths.length ? `<div><div class="label" style="font-size:10px;text-transform:uppercase;color:${BRAND.muted};">Pontos Fortes</div><ul class="clean">${cv.strengths.map((s: string) => `<li>✓ ${escapeHtml(s)}</li>`).join("")}</ul></div>` : ""}
          ${Array.isArray(cv.weaknesses) && cv.weaknesses.length ? `<div><div class="label" style="font-size:10px;text-transform:uppercase;color:${BRAND.muted};">Pontos de Atenção</div><ul class="clean">${cv.weaknesses.map((w: string) => `<li>! ${escapeHtml(w)}</li>`).join("")}</ul></div>` : ""}
        </div>
      </div>
    </div>` : "";

  // DISC
  const d = data.disc;
  const hasDisc = d && (d.d_score != null || d.i_score != null || d.s_score != null || d.c_score != null || d.summary);
  const discSection = hasDisc ? `
    <div class="section">
      <h2>DISC / Temperamento</h2>
      <div class="card">
        <div class="disc-grid">
          ${(["d", "i", "s", "c"] as const).map(k => `<div class="cell"><div class="v">${escapeHtml((d as any)[`${k}_score`] ?? "—")}</div><div class="k">${k.toUpperCase()}</div></div>`).join("")}
        </div>
        ${d!.summary ? `<p style="margin:10px 0 0;color:${BRAND.body};">${nl2brEscaped(d!.summary)}</p>` : ""}
        ${(d!.alerts && d!.alerts.length) ? d!.alerts.map(a => `<div class="alert" style="margin-top:8px;">⚠ ${escapeHtml(a)}</div>`).join("") : ""}
      </div>
    </div>` : "";

  // Respostas agrupadas por etapa
  const grouped = data.responses.reduce((acc, r) => {
    (acc[r.stage_label] ||= []).push(r);
    return acc;
  }, {} as Record<string, typeof data.responses>);
  const responsesSection = data.responses.length ? `
    <div class="section" style="page-break-inside:auto;">
      <h2>Respostas do Formulário</h2>
      ${Object.entries(grouped).map(([stage, rs]) => `
        <div style="margin-bottom:12px;">
          <h3 style="font-size:12px;margin-bottom:6px;color:${BRAND.dark};">${escapeHtml(stage || "Geral")}</h3>
          ${rs.map(r => `
            <div class="qa">
              <div class="q"><span class="code">${escapeHtml(r.code)}</span>${escapeHtml(r.question_text)}</div>
              <div class="a">${r.response_value ? nl2brEscaped(r.response_value) : "<em style='color:#aaa;'>Sem resposta</em>"}</div>
            </div>`).join("")}
        </div>`).join("")}
    </div>` : "";

  // Observações do recrutador
  const notesSection = (data.notes && data.notes.length) ? `
    <div class="section" style="page-break-inside:auto;">
      <h2>Observações do Recrutador</h2>
      ${data.notes.map(n => `
        <div class="card">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <strong style="font-size:11.5px;color:${BRAND.ink};">${escapeHtml(n.author_name || "Recrutador")}</strong>
            <span style="font-size:10px;color:${BRAND.muted};">${formatDateTime(n.created_at)}</span>
          </div>
          <div style="font-size:12px;color:${BRAND.body};">${nl2brEscaped(n.content)}</div>
        </div>`).join("")}
    </div>` : "";

  const html = renderDocument({
    title: `Relatório - ${c.name}`,
    kicker: "Relatório de Candidato",
    heading: c.name,
    subheading: `${c.email}${c.phone ? ` · ${c.phone}` : ""} — ${data.job?.title || "Vaga"}`,
    logoUrl,
    bodyHtml: scoreSection + personal + alerts + breakdown + cvSection + discSection + responsesSection + notesSection,
  });

  return printDocument(html);
}

/* ───────────────────────── Ficha da Vaga (PDF) ───────────────────────── */

export interface JobSheetData {
  logoSrc?: string;
  job: {
    title: string;
    area: string;
    status?: string | null;
    intro_title?: string | null;
    intro_message?: string | null;
    behavioral_profile?: string | null;
    practical_case?: string | null;
    required_skills?: string[] | null;
    min_culture_score?: number | null;
    min_technical_score?: number | null;
    created_at?: string | null;
  };
  stages: {
    label: string;
    weight: number;
    is_enabled: boolean;
    is_eliminatory: boolean;
    min_score: number | null;
    questionCount: number;
  }[];
  applicationUrl?: string;
}

const JOB_STATUS_LABEL: Record<string, string> = {
  active: "Ativa", draft: "Rascunho", closed: "Encerrada", archived: "Arquivada",
};

export function generateJobSheet(data: JobSheetData): boolean {
  const j = data.job;
  const logoUrl = data.logoSrc ? absoluteUrl(data.logoSrc) : undefined;
  const enabledStages = data.stages.filter(s => s.is_enabled);
  const totalWeight = enabledStages.reduce((sum, s) => sum + (s.weight || 0), 0);

  const overview = `
    <div class="section">
      <h2>Resumo</h2>
      <div class="card">
        <div class="grid2">
          <div class="field"><div class="label">Cargo</div><div class="value">${escapeHtml(j.title)}</div></div>
          <div class="field"><div class="label">Área</div><div class="value">${escapeHtml(j.area)}</div></div>
          <div class="field"><div class="label">Status</div><div class="value">${escapeHtml(JOB_STATUS_LABEL[j.status || ""] || j.status || "—")}</div></div>
          <div class="field"><div class="label">Criada em</div><div class="value">${formatDate(j.created_at)}</div></div>
        </div>
      </div>
    </div>`;

  const description = j.intro_message ? `
    <div class="section">
      <h2>${escapeHtml(j.intro_title || "Sobre a Vaga")}</h2>
      <div class="card"><div style="color:${BRAND.body};">${nl2brEscaped(j.intro_message)}</div></div>
    </div>` : "";

  const skills = (j.required_skills && j.required_skills.length) ? `
    <div class="section">
      <h2>Competências Técnicas</h2>
      <div>${j.required_skills.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join("")}</div>
    </div>` : "";

  const profile = j.behavioral_profile ? `
    <div class="section">
      <h2>Perfil Comportamental</h2>
      <div class="card"><div style="color:${BRAND.body};">${nl2brEscaped(j.behavioral_profile)}</div></div>
    </div>` : "";

  const practical = j.practical_case ? `
    <div class="section">
      <h2>Caso Prático</h2>
      <div class="card"><div style="color:${BRAND.body};">${nl2brEscaped(j.practical_case)}</div></div>
    </div>` : "";

  const process = enabledStages.length ? `
    <div class="section">
      <h2>Processo Seletivo · ${enabledStages.length} ${enabledStages.length === 1 ? "etapa" : "etapas"} · peso total ${totalWeight}%</h2>
      <div class="card" style="padding:4px 16px;">
        ${enabledStages.map((s, i) => `
          <div class="stage-row">
            <span class="idx">${i + 1}</span>
            <span class="nm">${escapeHtml(s.label)}${s.questionCount ? ` <span style="color:${BRAND.muted};font-weight:400;font-size:11px;">· ${s.questionCount} ${s.questionCount === 1 ? "pergunta" : "perguntas"}</span>` : ""}</span>
            ${s.is_eliminatory ? `<span class="pill" style="background:rgba(192,57,43,.1);color:${BRAND.danger};">Eliminatória${s.min_score != null ? ` · mín ${s.min_score}` : ""}</span>` : ""}
            <span class="pill" style="background:${BRAND.bgSoft};color:${BRAND.dark};">${s.weight}%</span>
          </div>`).join("")}
      </div>
    </div>` : "";

  const criteria = `
    <div class="section">
      <h2>Critérios Eliminatórios</h2>
      <div class="card">
        <div class="grid2">
          <div class="field"><div class="label">Score mínimo cultural</div><div class="value">${escapeHtml(j.min_culture_score ?? "—")}</div></div>
          <div class="field"><div class="label">Score mínimo técnico</div><div class="value">${escapeHtml(j.min_technical_score ?? "—")}</div></div>
        </div>
      </div>
    </div>`;

  const link = data.applicationUrl ? `
    <div class="section">
      <h2>Link de Candidatura</h2>
      <div class="card"><a href="${escapeHtml(data.applicationUrl)}" style="color:${BRAND.dark};font-weight:600;word-break:break-all;">${escapeHtml(data.applicationUrl)}</a></div>
    </div>` : "";

  const html = renderDocument({
    title: `Vaga - ${j.title}`,
    kicker: "Descrição de Vaga",
    heading: j.title,
    subheading: `${j.area}${j.status ? ` · ${JOB_STATUS_LABEL[j.status] || j.status}` : ""}`,
    logoUrl,
    bodyHtml: overview + description + skills + profile + practical + process + criteria + link,
  });

  return printDocument(html);
}
