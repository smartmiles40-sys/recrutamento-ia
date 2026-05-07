import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, MapPin, ChevronRight, Search, Loader2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo-horizontal-dark-teal.png";

interface PublicJob {
  id: string;
  title: string;
  area: string;
  created_at: string;
  required_skills: string[] | null;
}

export default function PublicJobs() {
  const [jobs, setJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id, title, area, created_at, required_skills")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setJobs(data || []);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.area.toLowerCase().includes(search.toLowerCase())
  );

  const areas = [...new Set(jobs.map((j) => j.area))];

  return (
    <div className="min-h-screen" style={{ background: "#F7F8F6" }}>
      {/* ── HERO + SEARCH ── */}
      <div style={{ background: "#0D2E2A" }}>
        {/* Hero */}
        <header className="mx-auto max-w-[1080px] px-6 sm:px-10" style={{ paddingTop: "64px" }}>
          {/* Brand mark */}
          <div className="flex items-center gap-3 mb-14">
            <img
              src={logo}
              alt="Se Tu For, Eu Vou!"
              className="h-9 rounded-lg object-contain"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>

          {/* Headline */}
          <h1
            className="font-serif font-normal leading-[1.12] tracking-tight"
            style={{ fontSize: "clamp(36px, 5vw, 52px)", color: "#FFFFFF", maxWidth: 680 }}
          >
            Não buscamos candidatos.
            <br />
            Buscamos pessoas que pensam como a gente.
          </h1>

          {/* Subtitle */}
          <p
            className="font-body font-normal leading-relaxed"
            style={{
              fontSize: "17px",
              color: "rgba(255,255,255,0.65)",
              marginTop: "22px",
              maxWidth: 520,
            }}
          >
            Se você é detalhista, não tolera improviso e entende que cada detalhe
            importa — pode ser exatamente quem procuramos.
          </p>

          {/* Credentials */}
          <div
            className="flex flex-wrap items-center gap-2 font-body"
            style={{
              marginTop: "40px",
              fontSize: "13px",
              color: "rgba(255,255,255,0.45)",
            }}
          >
             <span>Agência boutique de viagens</span>
             <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
             <span>Posicionamento exclusivo</span>
          </div>

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.08)",
              marginTop: "40px",
            }}
          />
        </header>

        {/* ── SEARCH & FILTERS ── */}
        <div className="mx-auto max-w-[1080px] px-6 sm:px-10" style={{ paddingTop: "32px", paddingBottom: "48px" }}>
          {/* Search input */}
          <div className="relative max-w-lg">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2"
              style={{ width: 18, height: 18, color: "#CBEF6E" }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por cargo ou área..."
              className="w-full font-body outline-none transition-all"
              style={{
                height: 48,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
                paddingLeft: 46,
                paddingRight: 16,
                fontSize: 14,
                color: "#FFFFFF",
              }}
            />
          </div>

          {/* Area pills */}
          {areas.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {areas.map((area) => {
                const isActive = search === area;
                return (
                  <button
                    key={area}
                    onClick={() => setSearch(isActive ? "" : area)}
                    className="font-body font-medium transition-all"
                    style={{
                      borderRadius: 20,
                      padding: "6px 16px",
                      fontSize: 13,
                      border: isActive ? "none" : "1px solid rgba(255,255,255,0.2)",
                      background: isActive ? "#CBEF6E" : "transparent",
                      color: isActive ? "#0D2E2A" : "rgba(255,255,255,0.7)",
                    }}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── JOB LISTING ── */}
      <main className="mx-auto max-w-[1080px] px-6 sm:px-10" style={{ paddingTop: 56, paddingBottom: 80 }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#0D2E2A" }} />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div
            className="text-center"
            style={{
              borderRadius: 16,
              border: "1px solid #E5E7EB",
              background: "#FFFFFF",
              padding: "80px 32px",
            }}
          >
            <Briefcase className="mx-auto" style={{ width: 48, height: 48, color: "#CBD5D4" }} />
            <p className="font-serif mt-5" style={{ fontSize: 22, color: "#0D2E2A" }}>
              Nenhuma vaga encontrada
            </p>
            <p className="font-body mt-2" style={{ fontSize: 14, color: "#7A8A89" }}>
              {search
                ? "Tente alterar os termos da pesquisa."
                : "No momento não há posições abertas. Volte em breve."}
            </p>
          </div>
        ) : (
          <>
            {/* Counter */}
            <div className="flex items-baseline gap-4 mb-10">
              <div>
                <span
                  className="font-body uppercase block"
                  style={{ fontSize: 11, letterSpacing: "0.1em", color: "#7A8A89" }}
                >
                  Posições abertas
                </span>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-serif" style={{ fontSize: 36, color: "#0D2E2A", lineHeight: 1 }}>
                    {filteredJobs.length}
                  </span>
                  <span className="font-body" style={{ fontSize: 14, color: "#9CA8A7" }}>
                    {filteredJobs.length === 1 ? "vaga" : "vagas"} · análise por IA em até 5 dias úteis
                  </span>
                </div>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-4">
              {filteredJobs.map((job, i) => (
                <Link
                  key={job.id}
                  to={`/aplicar/${job.id}`}
                  className="group relative flex items-center justify-between animate-fade-in"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: 12,
                    padding: "24px 28px",
                    animationDelay: `${i * 60}ms`,
                    transition: "box-shadow 0.25s ease, border-color 0.25s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(13,46,42,0.08)";
                    e.currentTarget.style.borderColor = "#CBEF6E";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "#E5E7EB";
                  }}
                >
                  <div className="flex items-start gap-5">
                    {/* Icon */}
                    <div
                      className="flex shrink-0 items-center justify-center"
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: "rgba(203,239,110,0.12)",
                      }}
                    >
                      <Briefcase style={{ width: 20, height: 20, color: "#0D2E2A" }} />
                    </div>

                    <div>
                      {/* Title */}
                      <h2
                        className="font-serif font-medium transition-colors"
                        style={{ fontSize: 19, color: "#0D2E2A", lineHeight: 1.3 }}
                      >
                        {job.title}
                      </h2>

                      {/* Meta */}
                      <div
                        className="flex items-center gap-3 font-body mt-1.5"
                        style={{ fontSize: 13, color: "#7A8A89" }}
                      >
                        <span className="flex items-center gap-1">
                          <MapPin style={{ width: 13, height: 13 }} />
                          {job.area}
                        </span>
                      </div>

                      {/* Skills */}
                      {job.required_skills && job.required_skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {job.required_skills.slice(0, 5).map((skill) => (
                            <span
                              key={skill}
                              className="font-body font-medium"
                              style={{
                                borderRadius: 6,
                                padding: "2px 10px",
                                fontSize: 11,
                                background: "#F2F4F1",
                                color: "#5A6B6A",
                              }}
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="hidden sm:block font-body font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ fontSize: 13, color: "#0D2E2A" }}
                    >
                      Candidatar-se
                    </span>
                    <ArrowRight
                      className="transition-all group-hover:translate-x-1"
                      style={{ width: 18, height: 18, color: "#9CA8A7" }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid #E5E7EB", padding: "32px 0", background: "#F7F8F6" }}>
        <div className="mx-auto max-w-[1080px] px-6 sm:px-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Se Tu For, Eu Vou!" className="h-5 object-contain opacity-40" />
          </div>
          <span className="font-body" style={{ fontSize: 11, color: "#B0BAB9" }}>
            © {new Date().getFullYear()} Se Tu For, Eu Vou!
          </span>
        </div>
      </footer>
    </div>
  );
}
