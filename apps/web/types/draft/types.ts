export interface DraftCitation {
  title: string;
  citation: string;
  status: "Supported" | "Contradicted";
  court: string;
}

export interface DraftSection {
  id?: string;
  title: string;
  content: string;
  citations?: DraftCitation[];
}

export interface DraftPage {
  pageNumber: number;
  totalPdfPages: number;
  headerTitle: string;
  subHeader?: string;
  sections: DraftSection[];
}

export interface DraftVersion {
  version: string;
  label: string;
  date: string;
  summary: string;
  pages: DraftPage[];
  contentHtml?: string;
}

export interface DraftDocument {
  id: string;
  title: string;
  type: "draft" | "document";
  matterName?: string;
  court?: string;
  caseNumber?: string;
  currentVersion: string;
  versions: DraftVersion[];
  contentHtml?: string;
}
