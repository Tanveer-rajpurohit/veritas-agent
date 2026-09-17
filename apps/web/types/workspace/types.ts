export type MatterHealth = "Healthy" | "Needs attention" | "High risk";

export type MatterType =
  | "Insolvency (IBC)"
  | "Arbitration"
  | "Civil"
  | "Commercial"
  | "Property"
  | "Family"
  | "Criminal"
  | "Corporate"
  | "Tax"
  | "Intellectual Property";

export type MatterStage =
  | "Interim application"
  | "Drafting"
  | "Notice issued"
  | "Filed"
  | "Evidence"
  | "Arguments"
  | "Pre-filing review";

export type StageBucket = "initiation" | "drafting" | "progress" | "final";

export interface Matter {
  id: string;
  name: string;
  caseNumber: string;
  court: string;
  stage: MatterStage;
  practiceArea: string;
  lastActivity: string;
  updatedAt: number;
  petitioner: string;
  respondent: string;
  matterType: MatterType;
  createdDate: string;
  health: MatterHealth;
  discrepanciesCount?: number;
  citationsCount?: number;
}

export interface MatterFilters {
  types: string[];
  stages: string[];
  statuses: string[];
}
