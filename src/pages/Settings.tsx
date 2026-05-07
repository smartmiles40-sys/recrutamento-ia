import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useBlockTemplates,
  useAllBlockTemplateQuestions,
  useCreateBlockTemplate,
  useUpdateBlockTemplate,
  useDeleteBlockTemplate,
  useCreateBlockQuestion,
  useUpdateBlockQuestion,
  useDeleteBlockQuestion,
} from "@/hooks/useBlockTemplates";
import {
  ChevronDown, ChevronUp, Plus, X, Trash2, Copy, Download, Upload,
  ToggleLeft, ToggleRight, Library, Shield, Users, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FIELD_TYPES = [
  { value: "text", label: "Texto curto" },
  { value: "textarea", label: "Texto longo" },
  { value: "number", label: "Número" },
  { value: "select", label: "Múltipla escolha" },
  { value: "upload", label: "Upload" },
  { value: "url", label: "URL" },
];

export default function Settings() {
  const { role } = useAuth();
  const { toast } = useToast();

  if (role !== "admin") {
    return (
      <AppLayout>
        <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
          Acesso restrito a administradores.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Administração global do sistema de recrutamento</p>
      </div>

      <Tabs defaultValue="blocks" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 gap-1 bg-muted p-1">
          <TabsTrigger value="blocks" className="flex items-center gap-2 text-xs">
            <Library className="h-3.5 w-3.5" /> Biblioteca de Blocos
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2 text-xs">
            <Shield className="h-3.5 w-3.5" /> Regras Globais
          </TabsTrigger>
          <TabsTrigger value="disc" className="flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" /> DISC / Temperamento
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5" /> Usuários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="blocks">
          <BlockLibrary />
        </TabsContent>
        <TabsContent value="rules">
          <GlobalRules />
        </TabsContent>
        <TabsContent value="disc">
          <DiscSettings />
        </TabsContent>
        <TabsContent value="users">
          <UserSettings />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}

function BlockLibrary() {
  const { data: blocks = [], isLoading } = useBlockTemplates();
  const { data: allQuestions = [] } = useAllBlockTemplateQuestions();
  const createBlock = useCreateBlockTemplate();
  const updateBlock = useUpdateBlockTemplate();
  const deleteBlock = useDeleteBlockTemplate();
  const createQuestion = useCreateBlockQuestion();
  const updateQuestion = useUpdateBlockQuestion();
  const deleteQuestion = useDeleteBlockQuestion();
  const { toast } = useToast();

  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState("textarea");
  const [showCreate, setShowCreate] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [newBlockDesc, setNewBlockDesc] = useState("");
  const [newBlockKey, setNewBlockKey] = useState("custom");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  const handleExportJSON = (block: any) => {
    const bQuestions = allQuestions.filter((q) => q.block_template_id === block.id);
    const exportData = { ...block, questions: bQuestions };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${block.stage_key}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "JSON exportado!" });
  };

  const handleImportJSON = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const newBlock = await createBlock.mutateAsync({
          name: data.name || "Bloco Importado",
          description: data.description || null,
          stage_key: data.stage_key || "custom",
          suggested_weight: data.suggested_weight || 0,
          is_eliminatory: data.is_eliminatory || false,
          is_active: true,
        });
        if (data.questions?.length && newBlock) {
          for (const q of data.questions) {
            await createQuestion.mutateAsync({
              block_template_id: newBlock.id,
              question_text: q.question_text,
              field_type: q.field_type || "textarea",
              options: q.options || null,
              is_required: q.is_required ?? true,
              question_order: q.question_order,
            });
          }
        }
        toast({ title: "Bloco importado com sucesso!" });
      } catch {
        toast({ title: "Erro ao importar JSON", variant: "destructive" });
      }
    };
    input.click();
  };

  const handleDuplicate = async (block: any) => {
    const bQuestions = allQuestions.filter((q) => q.block_template_id === block.id);
    const newBlock = await createBlock.mutateAsync({
      name: block.name + " (cópia)",
      description: block.description,
      stage_key: block.stage_key,
      suggested_weight: block.suggested_weight,
      is_eliminatory: block.is_eliminatory,
      is_active: true,
    });
    if (newBlock && bQuestions.length > 0) {
      for (const q of bQuestions) {
        await createQuestion.mutateAsync({
          block_template_id: newBlock.id,
          question_text: q.question_text,
          field_type: q.field_type,
          options: q.options,
          is_required: q.is_required,
          question_order: q.question_order,
        });
      }
    }
  };

  const handleAddQuestion = (blockId: string) => {
    if (!newQuestionText.trim()) return;
    const bqs = allQuestions.filter((q) => q.block_template_id === blockId);
    createQuestion.mutate({
      block_template_id: blockId,
      question_text: newQuestionText.trim(),
      field_type: newQuestionType,
      is_required: true,
      question_order: bqs.length + 1,
    });
    setNewQuestionText("");
    setNewQuestionType("textarea");
  };

  const handleCreateBlock = () => {
    if (!newBlockName.trim()) return;
    createBlock.mutate({
      name: newBlockName.trim(),
      description: newBlockDesc.trim() || null,
      stage_key: newBlockKey,
      suggested_weight: 0,
      is_eliminatory: false,
      is_active: true,
    });
    setNewBlockName("");
    setNewBlockDesc("");
    setShowCreate(false);
  };

  if (isLoading) return <div className="py-8 text-center text-muted-foreground">Carregando blocos...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Biblioteca de Blocos</h2>
        <div className="flex gap-2">
          <button onClick={handleImportJSON} className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/80">
            <Upload className="h-3.5 w-3.5" /> Importar JSON
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90">
            <Plus className="h-3.5 w-3.5" /> Novo Bloco
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-sm font-bold text-foreground">Criar Novo Bloco</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input value={newBlockName} onChange={(e) => setNewBlockName(e.target.value)} placeholder="Nome do bloco" className={inputClass} />
            <input value={newBlockDesc} onChange={(e) => setNewBlockDesc(e.target.value)} placeholder="Descrição" className={inputClass} />
            <input value={newBlockKey} onChange={(e) => setNewBlockKey(e.target.value)} placeholder="stage_key" className={inputClass} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreateBlock} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Criar</button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {blocks.map((block) => {
          const bQuestions = allQuestions.filter((q) => q.block_template_id === block.id);
          const isExpanded = expandedBlock === block.id;
          return (
            <div key={block.id} className="rounded-xl border border-border bg-card shadow-card">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => setExpandedBlock(isExpanded ? null : block.id)} className="text-muted-foreground">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-bold text-foreground">{block.name}</h3>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{block.stage_key}</span>
                    {block.is_eliminatory && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">Eliminatório</span>
                    )}
                  </div>
                  {block.description && <p className="mt-0.5 text-xs text-muted-foreground">{block.description}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-muted-foreground">{bQuestions.length} perguntas</span>
                  <button onClick={() => updateBlock.mutate({ id: block.id, is_active: !block.is_active })} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title={block.is_active ? "Desativar" : "Ativar"}>
                    {block.is_active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4" />}
                  </button>
                  <button onClick={() => handleDuplicate(block)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Duplicar">
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleExportJSON(block)} className="rounded p-1.5 text-muted-foreground hover:bg-muted" title="Exportar JSON">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(block.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Excluir">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4">
                  <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Peso sugerido</label>
                      <input
                        type="number" min={0} max={100}
                        value={block.suggested_weight}
                        onChange={(e) => updateBlock.mutate({ id: block.id, suggested_weight: Number(e.target.value) })}
                        className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="flex items-center gap-1.5 text-xs text-foreground">
                        <input
                          type="checkbox"
                          checked={block.is_eliminatory}
                          onChange={(e) => updateBlock.mutate({ id: block.id, is_eliminatory: e.target.checked })}
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        Eliminatório
                      </label>
                    </div>
                  </div>

                  {/* Critérios de Avaliação da IA */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-semibold text-foreground">Critérios de Avaliação da IA</label>
                    <p className="mb-1.5 text-[10px] text-muted-foreground">Descreva exatamente o que a IA deve avaliar nesta etapa, como pontuar, o que valorizar e penalizar.</p>
                    <textarea
                      value={block.evaluation_criteria || ""}
                      onChange={(e) => updateBlock.mutate({ id: block.id, evaluation_criteria: e.target.value || null })}
                      placeholder="Ex: Avaliar aderência aos valores STFEV. Valorizar respostas que demonstrem protagonismo e senso de dono. Penalizar respostas genéricas sem exemplos práticos..."
                      className="min-h-[100px] w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Material de Referência */}
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-semibold text-foreground">Material de Referência</label>
                    <p className="mb-1.5 text-[10px] text-muted-foreground">Cole trechos do manual de cultura, diretrizes internas, perfil comportamental esperado, etc.</p>
                    <textarea
                      value={block.reference_material || ""}
                      onChange={(e) => updateBlock.mutate({ id: block.id, reference_material: e.target.value || null })}
                      placeholder="Ex: Valores STFEV: S - Senso de Dono: o colaborador age como se a empresa fosse dele... T - Transparência: comunicação aberta e honesta..."
                      className="min-h-[100px] w-full rounded-lg border border-input bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-2">
                    {bQuestions.map((q) => (
                      <div key={q.id} className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
                        <div className="flex-1">
                          <input
                            value={q.question_text}
                            onChange={(e) => updateQuestion.mutate({ id: q.id, question_text: e.target.value })}
                            className="w-full bg-transparent text-sm text-foreground focus:outline-none"
                          />
                          <div className="mt-1 flex items-center gap-2">
                            <select
                              value={q.field_type}
                              onChange={(e) => updateQuestion.mutate({ id: q.id, field_type: e.target.value })}
                              className="h-6 rounded border border-input bg-background px-1 text-[10px]"
                            >
                              {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                            </select>
                            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={q.is_required}
                                onChange={(e) => updateQuestion.mutate({ id: q.id, is_required: e.target.checked })}
                                className="h-3 w-3"
                              />
                              Obrigatória
                            </label>
                          </div>
                        </div>
                        <button onClick={() => deleteQuestion.mutate(q.id)} className="rounded p-1 text-muted-foreground hover:text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Nova pergunta..."
                      className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm"
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddQuestion(block.id); }}
                    />
                    <select value={newQuestionType} onChange={(e) => setNewQuestionType(e.target.value)} className="h-8 rounded border border-input bg-background px-2 text-xs">
                      {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                    </select>
                    <button onClick={() => handleAddQuestion(block.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco template?</AlertDialogTitle>
            <AlertDialogDescription>Isso não afeta blocos já adicionados em vagas existentes.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteId) deleteBlock.mutate(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function GlobalRules() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">Regras de Classificação</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-success/10 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-sm font-bold text-success-foreground">F</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Forte</p>
              <p className="text-xs text-muted-foreground">Score final ≥ 80</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-warning/10 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning text-sm font-bold text-warning-foreground">D</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Desenvolvível</p>
              <p className="text-xs text-muted-foreground">Score final entre 70 e 79</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-destructive/10 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-sm font-bold text-destructive-foreground">R</div>
            <div>
              <p className="text-sm font-semibold text-foreground">Risco</p>
              <p className="text-xs text-muted-foreground">Score final &lt; 70</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">Regras de Cálculo</h2>
        <ul className="space-y-2 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            Etapas não coletadas/respondidas não entram no cálculo do score final.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            O score é ponderado proporcionalmente sobre as etapas respondidas.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            Cultura e Técnica podem ter regras eliminatórias configuráveis por vaga (toggle).
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            Score Cultural inferior ao mínimo configurado resulta em reprovação automática (quando ativo).
          </li>
        </ul>
      </div>
    </div>
  );
}

function DiscSettings() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-lg font-bold text-foreground">DISC e Temperamento</h2>
        <ul className="space-y-3 text-sm text-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            DISC e Temperamento só aparecem no perfil do candidato se houver dado real coletado.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
            Sem dado preenchido: exibe "Não coletado".
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 font-display text-base font-bold text-foreground">Modos de Coleta Disponíveis</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-4">
            <Upload className="mb-2 h-6 w-6 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Upload Manual</h3>
            <p className="mt-1 text-xs text-muted-foreground">PDF ou imagem com resultado do teste DISC</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <FileText className="mb-2 h-6 w-6 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Campos Estruturados</h3>
            <p className="mt-1 text-xs text-muted-foreground">D / I / S / C scores + resumo + alertas</p>
          </div>
          <div className="rounded-lg border border-border p-4">
            <Library className="mb-2 h-6 w-6 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Link Externo</h3>
            <p className="mt-1 text-xs text-muted-foreground">URL para ferramenta externa de avaliação (opcional)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserSettings() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "recruiter" | "reader">("recruiter");
  const [creating, setCreating] = useState(false);

  const queryClient = useQueryClient();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name");
      if (!roles) return [];
      return roles.map((r) => {
        const profile = profiles?.find((p) => p.user_id === r.user_id);
        return { user_id: r.user_id, role: r.role, display_name: profile?.display_name || "—" };
      });
    },
  });

  const handleCreate = async () => {
    if (!email || !password || !name) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("create-user", {
        body: { email, password, name, role },
      });
      if (res.error || res.data?.error) {
        throw new Error(res.data?.error || res.error?.message || "Erro ao criar usuário");
      }
      toast({ title: "Usuário criado com sucesso!" });
      setEmail("");
      setPassword("");
      setName("");
      setRole("recruiter");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const ROLE_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    admin: { label: "Admin", color: "bg-primary text-primary-foreground", icon: "A" },
    recruiter: { label: "Recrutador", color: "bg-accent text-accent-foreground", icon: "R" },
    reader: { label: "Leitor", color: "bg-muted text-muted-foreground", icon: "L" },
  };

  const inputClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-foreground">Usuários e Permissões</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90"
        >
          <Plus className="h-3.5 w-3.5" /> Cadastrar Usuário
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <h3 className="mb-3 font-display text-sm font-bold text-foreground">Novo Usuário</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Perfil</label>
              <select value={role} onChange={(e) => setRole(e.target.value as any)} className={inputClass}>
                <option value="admin">Admin</option>
                <option value="recruiter">Recrutador</option>
                <option value="reader">Leitor</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} disabled={creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {creating ? "Criando..." : "Criar Usuário"}
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground">Cancelar</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-card">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : (
          <div className="divide-y divide-border">
            {users.map((u) => {
              const meta = ROLE_LABELS[u.role] || ROLE_LABELS.reader;
              return (
                <div key={u.user_id} className="flex items-center gap-3 p-4">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold", meta.color)}>
                    {meta.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{u.display_name}</p>
                    <p className="text-[10px] text-muted-foreground">{u.user_id.slice(0, 8)}…</p>
                  </div>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground capitalize">{meta.label}</span>
                </div>
              );
            })}
            {users.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum usuário cadastrado.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
