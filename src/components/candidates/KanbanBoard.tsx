import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Mail } from "lucide-react";
import { DbCandidate, PipelineStage, PIPELINE_STAGES, useUpdateCandidate } from "@/hooks/useCandidates";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Job {
  id: string;
  title: string;
}

interface KanbanBoardProps {
  candidates: DbCandidate[];
  jobs: Job[];
}

function KanbanCard({ candidate, jobs, isDragging }: { candidate: DbCandidate; jobs: Job[]; isDragging?: boolean }) {
  const job = jobs.find(j => j.id === candidate.job_id);
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow cursor-pointer",
      isDragging ? "shadow-lg opacity-80" : "hover:shadow-md"
    )}>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {candidate.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <span className="text-[13px] font-medium text-foreground truncate">{candidate.name}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="font-display text-base font-bold text-foreground">
          {candidate.final_score !== null ? Math.round(candidate.final_score) : "—"}
        </span>
        <span className={cn(
          "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
          candidate.classification === "Forte" ? "bg-success/10 text-foreground" :
          candidate.classification === "Desenvolvível" ? "bg-warning/10 text-foreground" :
          candidate.classification === "Risco" ? "bg-destructive/10 text-destructive" :
          "bg-muted text-muted-foreground"
        )}>
          {candidate.classification || "Pendente"}
        </span>
      </div>
      <p className="mt-1.5 truncate text-[11px] text-muted-foreground">{job?.title || "—"}</p>
      <p className="text-[11px] text-muted-foreground/70">{new Date(candidate.applied_at).toLocaleDateString("pt-BR")}</p>
    </div>
  );
}

function DraggableCard({ candidate, jobs }: { candidate: DbCandidate; jobs: Job[] }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: candidate.id, data: { candidate } });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <Link to={`/candidatos/${candidate.id}`} onClick={(e) => { if (isDragging) e.preventDefault(); }}>
        <KanbanCard candidate={candidate} jobs={jobs} isDragging={isDragging} />
      </Link>
    </div>
  );
}

function KanbanColumn({ stage, candidates, jobs }: { stage: typeof PIPELINE_STAGES[0]; candidates: DbCandidate[]; jobs: Job[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const isContratado = stage.key === "contratado";
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-[220px] flex-shrink-0 flex-col rounded-xl border border-border",
        isOver ? "bg-accent/30" : "bg-muted/30"
      )}
    >
      <div className="rounded-t-xl px-3 py-2" style={{ borderTop: `3px solid ${stage.color}` }}>
        <span className={cn("text-[11px] font-semibold uppercase tracking-wide", isContratado ? "text-[#0D2E2A]" : "text-muted-foreground")}>
          {stage.label} ({candidates.length})
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: "calc(100vh - 280px)" }}>
        {candidates.map(c => (
          <DraggableCard key={c.id} candidate={c} jobs={jobs} />
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard({ candidates, jobs }: KanbanBoardProps) {
  const updateCandidate = useUpdateCandidate();
  const [activeCandidate, setActiveCandidate] = useState<DbCandidate | null>(null);
  const [confirmMove, setConfirmMove] = useState<{ candidate: DbCandidate; to: PipelineStage } | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const c = event.active.data.current?.candidate as DbCandidate;
    setActiveCandidate(c || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCandidate(null);
    const { active, over } = event;
    if (!over) return;
    const candidateId = active.id as string;
    const newStage = over.id as PipelineStage;
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate || candidate.pipeline_stage === newStage) return;

    if (newStage === "reprovado") {
      setConfirmMove({ candidate, to: newStage });
    } else {
      updateCandidate.mutate({ id: candidateId, pipeline_stage: newStage } as any);
    }
  };

  const confirmReject = () => {
    if (!confirmMove) return;
    updateCandidate.mutate({ id: confirmMove.candidate.id, pipeline_stage: confirmMove.to } as any);
    setConfirmMove(null);
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn
              key={stage.key}
              stage={stage}
              candidates={candidates.filter(c => (c.pipeline_stage || "nova_candidatura") === stage.key)}
              jobs={jobs}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCandidate && <KanbanCard candidate={activeCandidate} jobs={jobs} isDragging />}
        </DragOverlay>
      </DndContext>

      <AlertDialog open={!!confirmMove} onOpenChange={() => setConfirmMove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para Reprovado?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja mover {confirmMove?.candidate.name} para Reprovado? Essa ação pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmReject}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
