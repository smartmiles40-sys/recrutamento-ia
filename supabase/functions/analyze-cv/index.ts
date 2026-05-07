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
    const { cvPath, candidateId, jobTitle, jobArea, requiredSkills, behavioralProfile, jobId } = await req.json();

    if (!cvPath || !jobTitle) {
      return new Response(JSON.stringify({ error: "cvPath and jobTitle are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: fileData, error: fileError } = await supabase.storage
      .from("cvs")
      .download(cvPath);

    if (fileError || !fileData) {
      console.error("Storage error:", fileError);
      return new Response(JSON.stringify({ error: "Failed to download CV" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Content = btoa(binary);

    const extension = cvPath.split(".").pop()?.toLowerCase();
    const mimeType = extension === "pdf" ? "application/pdf"
      : extension === "docx" ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : extension === "doc" ? "application/msword"
      : "application/octet-stream";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    let cvEvaluationCriteria = "";
    let cvReferenceMaterial = "";
    if (jobId) {
      const { data: cvStageData } = await supabase
        .from("job_stages")
        .select("evaluation_criteria, reference_material")
        .eq("job_id", jobId)
        .eq("stage_key", "cv_upload")
        .single();
      if (cvStageData) {
        cvEvaluationCriteria = cvStageData.evaluation_criteria || "";
        cvReferenceMaterial = cvStageData.reference_material || "";
      }
    }

    const customCriteriaBlock = cvEvaluationCriteria
      ? `\n## CRITÉRIOS ESPECÍFICOS CONFIGURADOS PELO RECRUTADOR (PRIORIDADE MÁXIMA):\n${cvEvaluationCriteria}\n\nAplique estes critérios RIGOROSAMENTE na análise.\n`
      : "";

    const referenceMaterialBlock = cvReferenceMaterial
      ? `\n## MATERIAL DE REFERÊNCIA:\n${cvReferenceMaterial}\n`
      : "";

    const prompt = `Você é um avaliador EXTREMAMENTE RIGOROSO e CRITERIOSO de currículos para recrutamento. Sua função é proteger a empresa de contratações ruins.
${customCriteriaBlock}${referenceMaterialBlock}

## REGRAS CRÍTICAS DE VALIDAÇÃO:

1. **Verificação de documento**: Se o conteúdo NÃO for um currículo real, retorne score 0 e recommendation "Não Recomendado".

2. **VERIFICAÇÃO DE ÁREA/RELEVÂNCIA**:
   - Compare a ÁREA DE ATUAÇÃO REAL do candidato com a ÁREA DA VAGA.
   - Se a área é DIFERENTE da vaga, score MÁXIMO = 40.
   - NÃO INVENTE conexões.

3. **VERIFICAÇÃO DE ESTABILIDADE / JOB-HOPPING**:
   - 3+ empresas com menos de 6 meses → score MÁXIMO = 30, recommendation = "Não Recomendado"
   - 2 empresas com menos de 6 meses → reduzir 20-25 pontos
   - 1 empresa com menos de 6 meses → reduzir 10 pontos
   - Considere exceções: estágios, contratos temporários, primeira experiência.
   - SEMPRE liste o tempo médio de permanência no summary.

4. **Competências obrigatórias**:
   - Verifique evidência concreta para cada uma.
   - Se >50% não estão evidenciadas, score máximo = 50.
   - Competências da vaga: ${requiredSkills?.join(", ") || "Não especificadas"}

5. **QUALIDADE DA ESCRITA**:
   - Erros graves de português → reduzir 10-15 pontos.
   - Liste os erros em weaknesses.

6. **PONTUAÇÃO**:
   - 0-10: Arquivo inválido
   - 11-25: Área completamente diferente OU job-hopper crônico
   - 26-40: Área tangencialmente relacionada
   - 41-55: Alguma experiência, faltam competências
   - 56-70: Experiência relevante com gaps
   - 71-85: Boa aderência, experiência sólida
   - 86-100: Excepcional

## VAGA:
- **Título:** ${jobTitle}
- **Área:** ${jobArea || "Não especificada"}
- **Competências obrigatórias:** ${requiredSkills?.join(", ") || "Não especificadas"}
- **Perfil comportamental:** ${behavioralProfile || "Não especificado"}

## Currículo:
O arquivo está anexado. Analise LITERALMENTE o que está escrito.

Retorne JSON puro (sem markdown):
{
  "score": <0 a 100>,
  "summary": "<2-3 frases>",
  "strengths": ["<ponto forte real>"],
  "weaknesses": ["<gap real>"],
  "recommendation": "<Recomendado | Com Ressalvas | Não Recomendado>"
}

REGRAS INVIOLÁVEIS:
- Área diferente → score ≤ 40, "Não Recomendado"
- Job-hopper crônico → score ≤ 30, "Não Recomendado"
- NÃO INVENTE qualidades. Cite APENAS o escrito.`;

    const userContent: any[] = [{ type: "text", text: prompt }];

    if (mimeType === "application/pdf") {
      userContent.push({
        type: "file",
        file: {
          filename: cvPath.split("/").pop() || "cv.pdf",
          file_data: `data:${mimeType};base64,${base64Content}`,
        },
      });
    } else {
      userContent.push({
        type: "text",
        text: `\n\n[Arquivo em formato ${mimeType}. Conteúdo base64 (primeiros 8000 chars):]\n${base64Content.slice(0, 8000)}`,
      });
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você é um assistente de RH especializado em análise de currículos. Sempre responda em JSON válido." },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("OpenAI error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "Erro ao analisar currículo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let analysis;
    try {
      const jsonStr = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      analysis = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      analysis = {
        score: 50,
        summary: content.substring(0, 300),
        strengths: [],
        weaknesses: [],
        recommendation: "Com Ressalvas",
      };
    }

    if (candidateId) {
      const { error: updateError } = await supabase
        .from("candidates")
        .update({ cv_analysis: analysis })
        .eq("id", candidateId);
      if (updateError) {
        console.error("Failed to save cv_analysis:", updateError);
      }

      const { data: candidate } = await supabase
        .from("candidates")
        .select("job_id")
        .eq("id", candidateId)
        .single();

      if (candidate?.job_id) {
        const { data: cvStage } = await supabase
          .from("job_stages")
          .select("id")
          .eq("job_id", candidate.job_id)
          .eq("stage_key", "cv_upload")
          .single();

        if (cvStage) {
          await supabase
            .from("candidate_evaluations")
            .delete()
            .eq("candidate_id", candidateId)
            .eq("stage_id", cvStage.id)
            .is("evaluator_id", null);

          await supabase
            .from("candidate_evaluations")
            .insert({
              candidate_id: candidateId,
              stage_id: cvStage.id,
              score: analysis.score ?? 0,
              notes: `Análise IA: ${analysis.recommendation || ""} — ${analysis.summary || ""}`,
            });

          await supabase.rpc("calculate_candidate_score", { p_candidate_id: candidateId });
        }
      }
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-cv error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
