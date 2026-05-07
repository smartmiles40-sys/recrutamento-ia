import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { candidateId } = await req.json();
    if (!candidateId) {
      return new Response(JSON.stringify({ error: "candidateId is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { data: candidate } = await supabase
      .from("candidates")
      .select("id, name, job_id")
      .eq("id", candidateId)
      .single();
    if (!candidate) throw new Error("Candidate not found");

    const { data: disc } = await supabase
      .from("candidate_disc")
      .select("*")
      .eq("candidate_id", candidateId)
      .maybeSingle();
    if (!disc || (disc.d_score == null && disc.i_score == null && disc.s_score == null && disc.c_score == null)) {
      return new Response(JSON.stringify({ error: "DISC scores not found for this candidate" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job } = await supabase
      .from("jobs")
      .select("title, area, behavioral_profile, required_skills")
      .eq("id", candidate.job_id)
      .single();
    if (!job) throw new Error("Job not found");

    const { data: discStage } = await supabase
      .from("job_stages")
      .select("id, evaluation_criteria, reference_material, weight")
      .eq("job_id", candidate.job_id)
      .eq("stage_key", "disc")
      .eq("is_enabled", true)
      .maybeSingle();

    const customCriteria = discStage?.evaluation_criteria || "";
    const referenceMaterial = discStage?.reference_material || "";

    const prompt = `Você é um especialista em análise comportamental DISC aplicada a recrutamento.

## CANDIDATO:
- Nome: ${candidate.name}
- Scores DISC: D=${disc.d_score ?? "N/A"}, I=${disc.i_score ?? "N/A"}, S=${disc.s_score ?? "N/A"}, C=${disc.c_score ?? "N/A"}
${disc.summary ? `- Resumo: ${disc.summary}` : ""}

## VAGA:
- Título: ${job.title}
- Área: ${job.area}
- Competências: ${job.required_skills?.join(", ") || "N/A"}
- Perfil esperado: ${job.behavioral_profile || "N/A"}
${customCriteria ? `\n## CRITÉRIOS ESPECÍFICOS DISC (PRIORIDADE):\n${customCriteria}\n` : ""}
${referenceMaterial ? `\n## MATERIAL DE REFERÊNCIA:\n${referenceMaterial}\n` : ""}

## INSTRUÇÕES:
Analise o perfil DISC vs vaga. Avalie:
1. Compatibilidade (match_score 0-100)
2. Pontos fortes
3. Pontos de atenção
4. Alertas críticos
5. Resumo

${customCriteria ? "Use os CRITÉRIOS ESPECÍFICOS como base." : "Baseie-se no perfil esperado e competências."}

Use a tool analyze_disc_match.`;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "Você é um especialista em análise DISC. Use a tool fornecida." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_disc_match",
            description: "Análise de compatibilidade DISC com a vaga",
            parameters: {
              type: "object",
              properties: {
                match_score: { type: "number", description: "Score 0-100" },
                summary: { type: "string", description: "Parecer geral (máx 500 chars)" },
                strengths: { type: "array", items: { type: "string" }, description: "Pontos fortes" },
                concerns: { type: "array", items: { type: "string" }, description: "Pontos de atenção" },
                alerts: { type: "array", items: { type: "string" }, description: "Alertas críticos. Vazio se não houver." },
              },
              required: ["match_score", "summary", "strengths", "concerns", "alerts"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_disc_match" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenAI error:", aiResponse.status, errorText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`OpenAI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const parsed = JSON.parse(toolCall.function.arguments);
    const matchScore = Math.max(0, Math.min(100, Math.round(parsed.match_score)));

    await supabase
      .from("candidate_disc")
      .update({
        summary: parsed.summary,
        alerts: parsed.alerts || [],
      })
      .eq("candidate_id", candidateId);

    if (discStage) {
      await supabase
        .from("candidate_evaluations")
        .delete()
        .eq("candidate_id", candidateId)
        .eq("stage_id", discStage.id)
        .is("evaluator_id", null);

      const strengthsText = parsed.strengths?.length ? `\nPontos fortes: ${parsed.strengths.join("; ")}` : "";
      const concernsText = parsed.concerns?.length ? `\nPontos de atenção: ${parsed.concerns.join("; ")}` : "";
      const alertsText = parsed.alerts?.length ? `\nAlertas: ${parsed.alerts.join("; ")}` : "";

      await supabase
        .from("candidate_evaluations")
        .insert({
          candidate_id: candidateId,
          stage_id: discStage.id,
          score: matchScore,
          notes: `Análise DISC (IA): ${parsed.summary}${strengthsText}${concernsText}${alertsText}`,
        });

      await supabase.rpc("calculate_candidate_score", { p_candidate_id: candidateId });
    }

    return new Response(JSON.stringify({
      success: true,
      match_score: matchScore,
      summary: parsed.summary,
      strengths: parsed.strengths,
      concerns: parsed.concerns,
      alerts: parsed.alerts,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-disc error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
