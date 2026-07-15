import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DbJob {
  id: string;
  title: string;
  area: string;
  status: string;
  required_skills: string[];
  behavioral_profile: string | null;
  min_culture_score: number;
  min_technical_score: number;
  practical_case: string | null;
  culture_rejection_enabled: boolean;
  /** Vaga guarda-chuva: o candidato escolhe a área e o cargo de interesse. */
  is_talent_pool: boolean;
  /** Áreas ofertadas ao candidato. Vazio = todas as áreas ativas. */
  talent_pool_areas: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useJobs(statusFilter?: string) {
  return useQuery({
    queryKey: ["jobs", statusFilter],
    queryFn: async () => {
      let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DbJob[];
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as DbJob | null;
    },
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (job: Partial<DbJob>) => {
      const { data, error } = await supabase.from("jobs").insert([job as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Vaga criada com sucesso!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao criar vaga", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbJob> & { id: string }) => {
      const { data, error } = await supabase.from("jobs").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Vaga atualizada!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao atualizar vaga", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Vaga excluída!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao excluir vaga", description: e.message, variant: "destructive" });
    },
  });
}

export function useDuplicateJob() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sourceJobId: string) => {
      // 1. Fetch source job
      const { data: source, error: jobErr } = await supabase
        .from("jobs").select("*").eq("id", sourceJobId).single();
      if (jobErr || !source) throw jobErr || new Error("Vaga não encontrada");

      // 2. Create duplicate job (as draft)
      const { id: _id, created_at: _ca, updated_at: _ua, ...jobFields } = source;
      const { data: newJob, error: insertErr } = await supabase
        .from("jobs")
        .insert([{ ...jobFields, title: `${source.title} (cópia)`, status: "draft" }])
        .select().single();
      if (insertErr || !newJob) throw insertErr || new Error("Erro ao duplicar");

      // 3. Fetch and duplicate stages
      const { data: stages } = await supabase
        .from("job_stages").select("*").eq("job_id", sourceJobId).order("stage_order");
      if (stages && stages.length > 0) {
        for (const stage of stages) {
          const { id: oldStageId, created_at: _sc, job_id: _jid, ...stageFields } = stage;
          const { data: newStage } = await supabase
            .from("job_stages")
            .insert([{ ...stageFields, job_id: newJob.id }])
            .select().single();

          if (newStage) {
            // 4. Duplicate questions for this stage
            const { data: questions } = await supabase
              .from("stage_questions").select("*").eq("stage_id", oldStageId).order("question_order");
            if (questions && questions.length > 0) {
              const newQuestions = questions.map(({ id: _qid, created_at: _qc, stage_id: _sid, ...qFields }) => ({
                ...qFields, stage_id: newStage.id,
              }));
              await supabase.from("stage_questions").insert(newQuestions);
            }
          }
        }
      }

      return newJob;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast({ title: "Vaga duplicada com sucesso!", description: "A cópia foi criada como rascunho." });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao duplicar vaga", description: e.message, variant: "destructive" });
    },
  });
}