import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Area {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

/** Areas live in the database so the team can add one without a deploy. */
export function useAreas(includeInactive = false) {
  return useQuery({
    queryKey: ["areas", includeInactive],
    queryFn: async () => {
      let query = supabase.from("areas").select("*").order("sort_order");
      if (!includeInactive) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Area[];
    },
  });
}

/** Just the names, for the selects. */
export function useAreaNames() {
  const { data = [], ...rest } = useAreas();
  return { ...rest, data: data.map((a) => a.name) };
}

export function useCreateArea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (area: { name: string; sort_order?: number }) => {
      const { data, error } = await supabase.from("areas").insert([area]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["areas"] });
      toast({ title: "Área criada!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateArea() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Area> & { id: string }) => {
      const { error } = await supabase.from("areas").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["areas"] });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}
