import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DbEvaluation {
  id: string;
  candidate_id: string;
  stage_id: string;
  evaluator_id: string | null;
  score: number | null;
  max_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbDisc {
  id: string;
  candidate_id: string;
  d_score: number | null;
  i_score: number | null;
  s_score: number | null;
  c_score: number | null;
  summary: string | null;
  source: string | null;
  external_url: string | null;
  file_url: string | null;
  alerts: string[];
  created_at: string;
}

export function useCandidateEvaluations(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["evaluations", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_evaluations")
        .select("*")
        .eq("candidate_id", candidateId!);
      if (error) throw error;
      return (data ?? []) as DbEvaluation[];
    },
  });
}

export function useUpsertEvaluation() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (eval_: { candidate_id: string; stage_id: string; score: number; evaluator_id?: string }) => {
      const { data, error } = await supabase
        .from("candidate_evaluations")
        .upsert(
          { ...eval_, max_score: 100 },
          { onConflict: "candidate_id,stage_id,evaluator_id" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      qc.invalidateQueries({ queryKey: ["candidates"] });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao salvar avaliação", description: e.message, variant: "destructive" });
    },
  });
}

export function useCandidateDisc(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["disc", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_disc")
        .select("*")
        .eq("candidate_id", candidateId!)
        .maybeSingle();
      if (error) throw error;
      return data as DbDisc | null;
    },
  });
}

export function useUpsertDisc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (disc: Partial<DbDisc> & { candidate_id: string }) => {
      const { data, error } = await supabase
        .from("candidate_disc")
        .upsert(disc, { onConflict: "candidate_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disc"] });
    },
  });
}
