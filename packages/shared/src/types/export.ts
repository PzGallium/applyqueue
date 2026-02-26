export type ExportFormat = 'pdf' | 'docx';

export interface ExportRecord {
  id: string;
  userId: string;
  resumeId: string;
  format: ExportFormat;
  storagePath: string;
  downloadUrl: string;
  urlExpiresAt: string;
  fileSize: number;
  createdAt: string;
  metadata: {
    templateId: string;
    pageCount: number;
    version: number;
  };
}
