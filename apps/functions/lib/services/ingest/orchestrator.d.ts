import type { IngestResult, SourceConnector } from './connectors/types';
export declare function getConnector(type: string): SourceConnector | null;
export declare function registerConnector(type: string, connector: SourceConnector): void;
/**
 * Run the full ingest pipeline:
 * 1. Fetch all enabled sources
 * 2. Re-rank for all users who have preferences
 * 3. Compute delta feeds
 */
export declare function runIngestPipeline(): Promise<{
    sources: IngestResult[];
    usersRanked: number;
}>;
