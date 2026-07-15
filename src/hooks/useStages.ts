import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DbStage {
  id: string;
  job_id: string;
  stage_key: string;
  label: string;
  stage_order: number;
  weight: number;
  is_enabled: boolean;
  is_eliminatory: boolean;
  min_score: number | null;
  evaluation_criteria: string | null;
  reference_material: string | null;
  /** Bloco exclusivo de uma área. null = aparece para todos os candidatos. */
  area: string | null;
  created_at: string;
}

export interface DbQuestion {
  id: string;
  stage_id: string;
  question_text: string;
  field_type: string;
  options: any;
  is_required: boolean;
  question_order: number;
  created_at: string;
}

export function useJobStages(jobId: string | undefined) {
  return useQuery({
    queryKey: ["stages", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_stages")
        .select("*")
        .eq("job_id", jobId!)
        .order("stage_order");
      if (error) throw error;
      return (data ?? []) as DbStage[];
    },
  });
}

export function useStageQuestions(stageId: string | undefined) {
  return useQuery({
    queryKey: ["questions", stageId],
    enabled: !!stageId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stage_questions")
        .select("*")
        .eq("stage_id", stageId!)
        .order("question_order");
      if (error) throw error;
      return (data ?? []) as DbQuestion[];
    },
  });
}

export function useAllStageQuestions(jobId: string | undefined) {
  return useQuery({
    queryKey: ["all-questions", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data: stages, error: stagesError } = await supabase
        .from("job_stages")
        .select("id")
        .eq("job_id", jobId!);
      if (stagesError) throw stagesError;
      if (!stages?.length) return [];
      const stageIds = stages.map((s: any) => s.id);
      const { data, error } = await supabase
        .from("stage_questions")
        .select("*")
        .in("stage_id", stageIds)
        .order("question_order");
      if (error) throw error;
      return (data ?? []) as DbQuestion[];
    },
  });
}

export function useCreateStage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (stage: Partial<DbStage>) => {
      const { data, error } = await supabase.from("job_stages").insert([stage as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["stages"] });
      toast({ title: "Etapa criada!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbStage> & { id: string }) => {
      const { error } = await supabase.from("job_stages").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stages"] });
    },
  });
}

export function useDeleteStage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("job_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stages"] });
      toast({ title: "Etapa excluída!" });
    },
  });
}

export function useCreateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Partial<DbQuestion>) => {
      const { data, error } = await supabase.from("stage_questions").insert([q as any]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["all-questions"] });
    },
  });
}

export function useUpdateQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbQuestion> & { id: string }) => {
      const { error } = await supabase.from("stage_questions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["all-questions"] });
    },
  });
}

export function useDeleteQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stage_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["all-questions"] });
    },
  });
}

export const DEFAULT_STAGES = [
  { stage_key: "application", label: "Etapa 1 - Dados Básicos", stage_order: 1, weight: 15 },
  { stage_key: "cv_upload", label: "Etapa 2 - Currículo", stage_order: 2, weight: 0 },
  { stage_key: "technical", label: "Etapa 3 - Técnico", stage_order: 3, weight: 25 },
  { stage_key: "commercial", label: "Etapa 4 - Performance Comercial", stage_order: 4, weight: 25 },
  { stage_key: "culture", label: "Etapa 5 - Fit Cultural", stage_order: 5, weight: 25 },
  { stage_key: "disc", label: "DISC", stage_order: 6, weight: 5 },
  { stage_key: "online_interview", label: "Entrevista Online", stage_order: 7, weight: 15 },
  { stage_key: "in_person", label: "Entrevista Presencial", stage_order: 8, weight: 15 },
];
