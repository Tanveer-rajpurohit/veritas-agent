export interface SourceRecord {
  id: string;
  matter_id: string;
  canonical_title: string;
  source_type: string;
  is_synthetic: boolean;
  version_id: string;
  version_number: number;
  extraction_status: string;
  page_count: number | null;
}

export interface PageRecord {
  source_id: string;
  source_version_id: string;
  page_number: number;
  text: string;
  extraction_confidence: number | null;
}
