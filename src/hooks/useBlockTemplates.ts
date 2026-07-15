import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BlockTemplate {
  id: string;
  name: string;
  description: string | null;
  stage_key: string;
  /** Bloco exclusivo de uma área. null = vale para todas. */
  area: string | null;
  suggested_weight: number;
  is_eliminatory: boolean;
  is_active: boolean;
  evaluation_criteria: string | null;
  reference_material: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlockTemplateQuestion {
  id: string;
  block_template_id: string;
  question_text: string;
  field_type: string;
  options: any;
  is_required: boolean;
  question_order: number;
  created_at: string;
}

export function useBlockTemplates() {
  return useQuery({
    queryKey: ["block-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("block_templates")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as BlockTemplate[];
    },
  });
}

export function useBlockTemplateQuestions(blockId: string | undefined) {
  return useQuery({
    queryKey: ["block-template-questions", blockId],
    enabled: !!blockId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("block_template_questions")
        .select("*")
        .eq("block_template_id", blockId!)
        .order("question_order");
      if (error) throw error;
      return (data ?? []) as BlockTemplateQuestion[];
    },
  });
}

export function useAllBlockTemplateQuestions() {
  return useQuery({
    queryKey: ["all-block-template-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("block_template_questions")
        .select("*")
        .order("question_order");
      if (error) throw error;
      return (data ?? []) as BlockTemplateQuestion[];
    },
  });
}

export function useCreateBlockTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (block: Partial<BlockTemplate>) => {
      const { data, error } = await supabase
        .from("block_templates")
        .insert([block as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["block-templates"] });
      toast({ title: "Bloco criado!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

export function useUpdateBlockTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlockTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("block_templates")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["block-templates"] });
    },
  });
}

export function useDeleteBlockTemplate() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("block_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["block-templates"] });
      toast({ title: "Bloco excluído!" });
    },
  });
}

export function useCreateBlockQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (q: Partial<BlockTemplateQuestion>) => {
      const { data, error } = await supabase
        .from("block_template_questions")
        .insert([q as any])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["block-template-questions"] });
      qc.invalidateQueries({ queryKey: ["all-block-template-questions"] });
    },
  });
}

export function useUpdateBlockQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<BlockTemplateQuestion> & { id: string }) => {
      const { error } = await supabase
        .from("block_template_questions")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["block-template-questions"] });
      qc.invalidateQueries({ queryKey: ["all-block-template-questions"] });
    },
  });
}

export function useDeleteBlockQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("block_template_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["block-template-questions"] });
      qc.invalidateQueries({ queryKey: ["all-block-template-questions"] });
    },
  });
}

/** Add a block from the library to a specific job, copying its questions */
export function useAddBlockToJob() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({
      jobId,
      block,
      stageOrder,
      weight,
    }: {
      jobId: string;
      block: BlockTemplate;
      stageOrder: number;
      weight: number;
    }) => {
      // 1. Create job_stage from block
      const { data: stage, error: stageErr } = await supabase
        .from("job_stages")
        .insert([{
          job_id: jobId,
          stage_key: block.stage_key,
          label: block.name,
          stage_order: stageOrder,
          weight,
          is_enabled: true,
          is_eliminatory: block.is_eliminatory,
          source_block_id: block.id,
          evaluation_criteria: block.evaluation_criteria,
          reference_material: block.reference_material,
          area: block.area,
        }])
        .select()
        .single();
      if (stageErr) throw stageErr;

      // 2. Copy questions from block template
      const { data: templateQuestions, error: tqErr } = await supabase
        .from("block_template_questions")
        .select("*")
        .eq("block_template_id", block.id)
        .order("question_order");
      if (tqErr) throw tqErr;

      if (templateQuestions && templateQuestions.length > 0) {
        const newQuestions = templateQuestions.map((q: any) => ({
          stage_id: stage.id,
          question_text: q.question_text,
          field_type: q.field_type,
          options: q.options,
          is_required: q.is_required,
          question_order: q.question_order,
        }));
        const { error: qErr } = await supabase
          .from("stage_questions")
          .insert(newQuestions);
        if (qErr) throw qErr;
      }

      return stage;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stages"] });
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["all-questions"] });
      toast({ title: "Bloco adicionado à vaga!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}

/** Restore a stage's questions from its original block template */
export function useRestoreBlockQuestions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ stageId, blockId }: { stageId: string; blockId: string }) => {
      // Delete current questions (but responses stay linked)
      const { error: delErr } = await supabase
        .from("stage_questions")
        .delete()
        .eq("stage_id", stageId);
      if (delErr) throw delErr;

      // Copy fresh from template
      const { data: templateQuestions, error: tqErr } = await supabase
        .from("block_template_questions")
        .select("*")
        .eq("block_template_id", blockId)
        .order("question_order");
      if (tqErr) throw tqErr;

      if (templateQuestions && templateQuestions.length > 0) {
        const newQuestions = templateQuestions.map((q: any) => ({
          stage_id: stageId,
          question_text: q.question_text,
          field_type: q.field_type,
          options: q.options,
          is_required: q.is_required,
          question_order: q.question_order,
        }));
        const { error: qErr } = await supabase
          .from("stage_questions")
          .insert(newQuestions);
        if (qErr) throw qErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["questions"] });
      qc.invalidateQueries({ queryKey: ["all-questions"] });
      toast({ title: "Perguntas restauradas do template original!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });
}
