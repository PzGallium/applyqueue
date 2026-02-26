import type { RankedList } from '@applyqueue/shared';
export interface DeltaEntry {
    jobId: string;
    type: 'new' | 'rank_changed' | 'removed';
    currentRank: number | null;
    previousRank: number | null;
}
export interface DailyFeed {
    userId: string;
    date: string;
    entries: DeltaEntry[];
    totalNew: number;
    totalChanged: number;
    totalRemoved: number;
    generatedAt: string;
}
/**
 * Compare current ranked list with the previous one and produce a delta feed.
 * Stores result in job_feeds/{userId}/daily/{YYYY-MM-DD}.
 */
export declare function computeDelta(userId: string, current: RankedList): Promise<DailyFeed>;
