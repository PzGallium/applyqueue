export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'oa'
  | 'interview'
  | 'offer'
  | 'rejected';

export type Priority = 'high' | 'medium' | 'low';

export interface StatusHistoryEntry {
  status: ApplicationStatus;
  changedAt: string;
  note: string | null;
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  statusHistory: StatusHistoryEntry[];
  resumeId: string | null;
  appliedAt: string | null;
  notes: string;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export type ApplyStepName =
  | 'jd_fetch'
  | 'jd_parse'
  | 'project_match'
  | 'resume_generate'
  | 'export_pdf'
  | 'export_docx';

export type ApplyStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ApplyStep {
  step: ApplyStepName;
  status: ApplyStepStatus;
  durationMs?: number;
  error?: string;
}

export interface ApplyRequest {
  rank: number;
  options: {
    exportFormats: ('pdf' | 'docx')[];
    templateId: string;
    llmProvider: string;
    llmModel?: string;
  };
}

export interface ApplyResult {
  resumeId: string;
  exports: Array<{
    format: 'pdf' | 'docx';
    downloadUrl: string;
  }>;
  changeSummary: string;
  atsScore: number | null;
  cost: {
    provider: string;
    tokensUsed: number;
    estimatedCost: number;
  };
}
