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
    const { candidateId, jobId } = await req.json();
    if (!candidateId || !jobId) {
      return new Response(JSON.stringify({ error: "candidateId and jobId are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const { data: job } = await supabase.from("jobs").select("title, area, required_skills, behavioral_profile").eq("id", jobId).single();
    if (!job) throw new Error("Job not found");

    const { data: stages } = await supabase
      .from("job_stages")
      .select("id, stage_key, label, weight, evaluation_criteria, reference_material")
      .eq("job_id", jobId)
      .eq("is_enabled", true)
      .gt("weight", 0)
      .not("stage_key", "in", "(application,cv_upload)")
      .order("stage_order");

    if (!stages?.length) {
      return new Response(JSON.stringify({ message: "No scorable stages found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stageIds = stages.map(s => s.id);
    const { data: questions } = await supabase
      .from("stage_questions")
      .select("id, stage_id, question_text")
      .in("stage_id", stageIds)
      .order("question_order");

    const { data: responses } = await supabase
      .from("candidate_responses")
      .select("question_id, response_value")
      .eq("candidate_id", candidateId);

    if (!questions?.length || !responses?.length) {
      return new Response(JSON.stringify({ message: "No questions or responses found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseMap = new Map(responses.map(r => [r.question_id, r.response_value]));

    await supabase
      .from("candidate_evaluations")
      .delete()
      .eq("candidate_id", candidateId)
      .in("stage_id", stageIds)
      .is("evaluator_id", null);

    const results: { stageId: string; score: number; justification: string }[] = [];

    for (const stage of stages) {
      const stageQuestions = questions.filter(q => q.stage_id === stage.id);
      if (!stageQuestions.length) continue;

      const qaPairs = stageQuestions
        .map(q => {
          const answer = responseMap.get(q.id);
          return answer ? `Pergunta: ${q.question_text}\nResposta: ${answer}` : null;
        })
        .filter(Boolean)
        .join("\n\n");

      if (!qaPairs) continue;

      const hasCustomCriteria = !!stage.evaluation_criteria;
      const hasReferenceMaterial = !!stage.reference_material;

      const customCriteriaBlock = hasCustomCriteria
        ? `\n## CRITÉRIOS ESPECÍFICOS DESTA ETAPA (PRIORIDADE MÁXIMA):\n${stage.evaluation_criteria}\n`
        : "";

      const referenceMaterialBlock = hasReferenceMaterial
        ? `\n## MATERIAL DE REFERÊNCIA:\n${stage.reference_material}\n`
        : "";

      const prompt = `Você é um avaliador justo e criterioso.

Avalie as respostas para a etapa "${stage.label}" da vaga "${job.title}" (área: ${job.area || "N/A"}).

Competências desejadas: ${job.required_skills?.join(", ") || "N/A"}
Perfil comportamental: ${job.behavioral_profile || "N/A"}
${customCriteriaBlock}${referenceMaterialBlock}
## Respostas:
${qaPairs}

## PRINCÍPIO:
${hasCustomCriteria
  ? "Use os CRITÉRIOS ESPECÍFICOS configurados acima como base principal."
  : "Avalie CONTEÚDO e SUBSTÂNCIA. Erros de digitação são normais."}

## PONTUAÇÃO:
- 0-20: Vazio, sem sentido, irrelevante
- 21-40: Genérico sem evidências
- 41-60: Razoável, sem exemplos específicos
- 61-80: Bom, com evidências concretas
- 81-100: Excelente, múltiplas evidências

## VALORIZE:
- Números: metas, conversão, volume
- Ferramentas e metodologias
- Experiências específicas com detalhes

## ERROS DE PORTUGUÊS:
- Liste TODOS em "portuguese_errors", mesmo sem penalizar.
- Penalidade MÁXIMA: 5 pontos.

Use a tool score_stage.`;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: "Você é um avaliador de candidatos. Use a tool fornecida." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "score_stage",
              description: "Retorna nota, justificativa e erros de português",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "number", description: "Nota de 0 a 100" },
                  justification: { type: "string", description: "Justificativa (máx 300 caracteres)" },
                  portuguese_errors: {
                    type: "array",
                    items: { type: "string" },
                    description: "Erros de português. Vazio se nenhum.",
                  },
                },
                required: ["score", "justification", "portuguese_errors"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "score_stage" } },
        }),
      });

      if (!aiResponse.ok) {
        const statusCode = aiResponse.status;
        const errText = await aiResponse.text();
        console.error(`OpenAI error for stage ${stage.id}:`, statusCode, errText);
        if (statusCode === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue;
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error(`No tool call for stage ${stage.id}`);
        continue;
      }

      let parsed;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error(`Failed to parse for stage ${stage.id}`);
        continue;
      }

      const score = Math.max(0, Math.min(100, Math.round(parsed.score)));
      const portugueseErrors = parsed.portuguese_errors || [];
      const errorsText = portugueseErrors.length > 0
        ? `\n\nErros de português (${portugueseErrors.length}): ${portugueseErrors.join("; ")}`
        : "";
      results.push({ stageId: stage.id, score, justification: parsed.justification });

      await supabase.from("candidate_evaluations").insert({
        candidate_id: candidateId,
        stage_id: stage.id,
        score,
        notes: `Avaliação IA: ${parsed.justification}${errorsText}`,
      });
    }

    await supabase.rpc("calculate_candidate_score", { p_candidate_id: candidateId });

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("score-candidate-responses error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
