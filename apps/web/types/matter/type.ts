export interface BackendMatter {
  id: string;
  title: string;
  description: string | null;
  case_number: string | null;
  court: string | null;
  matter_type: string;
  stage: string;
  citation_style?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateMatterPayload {
  title: string;
  description?: string;
  case_number?: string;
  court?: string;
  matter_type?: string;
  stage?: string;
}

export interface UpdateMatterPayload {
  title?: string;
  description?: string;
  case_number?: string;
  court?: string;
  matter_type?: string;
  stage?: string;
}
