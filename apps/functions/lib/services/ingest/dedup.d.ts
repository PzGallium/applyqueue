import type { Job } from '@applyqueue/shared';
export interface DedupResult {
    newJobs: Job[];
    updatedJobs: Job[];
    skipped: number;
}
/**
 * Dedup a batch of normalized jobs against the Firestore `jobs` collection.
 * - New hash → insert
 * - Same hash, content changed → update
 * - Same hash, no change → skip
 */
export declare function dedupJobs(jobs: Job[]): Promise<DedupResult>;
