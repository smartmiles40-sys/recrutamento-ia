export type Area = "Comercial" | "Operações" | "Marketing" | "Financeiro" | "Relacionamento";

export type Classification = "Forte" | "Desenvolvível" | "Risco";

export type StageId = "application" | "video_or_case" | "culture" | "disc" | "online_interview" | "in_person";

export interface StageScore {
  score: number;
  maxScore: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  jobId: string;
  area: Area;
  currentStage: StageId;
  classification: Classification;
  scores: Partial<Record<StageId, StageScore>>;
  finalScore: number;
  appliedAt: string;
  alerts: string[];
}

export interface JobConfig {
  id: string;
  title: string;
  area: Area;
  status: "active" | "draft" | "closed";
  requiredSkills: string[];
  behavioralProfile: string;
  weights: Record<StageId, number>;
  minCultureScore: number;
  minTechnicalScore: number;
  createdAt: string;
  applicants: number;
  practicalCase?: string;
}
