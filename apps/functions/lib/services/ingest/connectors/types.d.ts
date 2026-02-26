import type { JobSourceConfig, JobSourceType } from '@applyqueue/shared';
export interface RawJob {
    externalId: string;
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
    postedAt: string | null;
    metadata: Record<string, unknown>;
}
export interface SourceConnector {
    type: JobSourceType;
    fetch(config: JobSourceConfig): Promise<RawJob[]>;
}
export interface IngestResult {
    source: string;
    fetched: number;
    newJobs: number;
    updatedJobs: number;
    errors: string[];
}
