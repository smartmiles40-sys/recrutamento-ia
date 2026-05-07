import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PipelineStage =
  | "nova_candidatura"
  | "em_analise"
  | "aprovado_entrevista"
  | "entrevista_agendada"
  | "entrevista_realizada"
  | "proposta_enviada"
  | "contratado"
  | "reprovado";

export const PIPELINE_STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: "nova_candidatura", label: "Nova Candidatura", color: "#6B7280" },
  { key: "em_analise", label: "Em Análise", color: "#3B82F6" },
  { key: "aprovado_entrevista", label: "Aprovado p/ Entrevista", color: "#22C55E" },
  { key: "entrevista_agendada", label: "Entrevista Agendada", color: "#F59E0B" },
  { key: "entrevista_realizada", label: "Entrevista Realizada", color: "#F97316" },
  { key: "proposta_enviada", label: "Proposta Enviada", color: "#8B5CF6" },
  { key: "contratado", label: "Contratado", color: "#CBEF6E" },
  { key: "reprovado", label: "Reprovado", color: "#EF4444" },
];

export interface DbCandidate {
  id: string;
  job_id: string;
  name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  cv_analysis: any;
  current_stage_id: string | null;
  status: string;
  classification: string | null;
  final_score: number | null;
  alerts: string[];
  applied_at: string;
  updated_at: string;
  pipeline_stage: PipelineStage;
}

export function useCandidates(filters?: { jobId?: string; classification?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["candidates", filters],
    queryFn: async () => {
      let query = supabase.from("candidates").select("*").order("applied_at", { ascending: false });
      if (filters?.jobId) query = query.eq("job_id", filters.jobId);
      if (filters?.classification) query = query.eq("classification", filters.classification);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.search) query = query.ilike("name", `%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DbCandidate[];
    },
  });
}

export function useCandidate(id: string | undefined) {
  return useQuery({
    queryKey: ["candidates", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as DbCandidate | null;
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbCandidate> & { id: string }) => {
      const { data, error } = await supabase.from("candidates").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: "Candidato atualizado!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: "Candidato excluído!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useCandidatesByJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ["candidates", "job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("job_id", jobId!)
        .order("final_score", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DbCandidate[];
    },
  });
}
