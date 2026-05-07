import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CandidateNote {
  id: string;
  candidate_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

export function useCandidateNotes(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-notes", candidateId],
    enabled: !!candidateId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_notes" as any)
        .select("*")
        .eq("candidate_id", candidateId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const notes = (data ?? []) as any as CandidateNote[];

      // Fetch author names
      const authorIds = [...new Set(notes.map(n => n.author_id))];
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", authorIds);
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]) || []);
        notes.forEach(n => {
          n.author_name = profileMap.get(n.author_id) || "Recrutador";
        });
      }

      return notes;
    },
  });
}

export function useAddCandidateNote() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ candidate_id, author_id, content }: { candidate_id: string; author_id: string; content: string }) => {
      const { data, error } = await supabase
        .from("candidate_notes" as any)
        .insert({ candidate_id, author_id, content } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["candidate-notes", vars.candidate_id] });
      toast({ title: "Observação adicionada!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}
