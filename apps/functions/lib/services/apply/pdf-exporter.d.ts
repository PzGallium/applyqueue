/**
 * Apply MVP — render ResumeContent to HTML and export to PDF (Letter).
 */
import type { ResumeContent } from './types';
export declare function resumeContentToHtml(content: ResumeContent): string;
export interface PdfExportResult {
    buffer: Buffer;
    /** Suggested filename (sanitized). */
    filename: string;
}
/**
 * Sanitize string for use in filename: replace / \ : * ? " < > | with underscore.
 */
export declare function sanitizeFilenamePart(s: string): string;
/**
 * Build suggested PDF filename: {name}_{company}_{role}_{YYYYMMDD}.pdf
 */
export declare function buildPdfFilename(displayName: string, company: string, role: string): string;
/**
 * Render ResumeContent to PDF buffer using Puppeteer. Uses Letter format.
 */
export declare function exportResumeToPdf(content: ResumeContent, filename: string): Promise<PdfExportResult>;
