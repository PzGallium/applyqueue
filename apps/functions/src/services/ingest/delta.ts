import { getFirestore } from 'firebase-admin/firestore';
import type { RankedList, RankedJob } from '@applyqueue/shared';

const db = getFirestore();

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
export async function computeDelta(
  userId: string,
  current: RankedList,
): Promise<DailyFeed> {
  const prevDoc = await db.doc(`ranked_lists_prev/${userId}`).get();
  const prevRankings: RankedJob[] = prevDoc.exists
    ? (prevDoc.data()!.rankings as RankedJob[]) ?? []
    : [];

  const prevMap = new Map(prevRankings.map((r) => [r.jobId, r]));
  const currentMap = new Map(current.rankings.map((r) => [r.jobId, r]));

  const entries: DeltaEntry[] = [];

  for (const r of current.rankings) {
    const prev = prevMap.get(r.jobId);
    if (!prev) {
      entries.push({ jobId: r.jobId, type: 'new', currentRank: r.rank, previousRank: null });
    } else if (prev.rank !== r.rank) {
      entries.push({ jobId: r.jobId, type: 'rank_changed', currentRank: r.rank, previousRank: prev.rank });
    }
  }

  for (const r of prevRankings) {
    if (!currentMap.has(r.jobId)) {
      entries.push({ jobId: r.jobId, type: 'removed', currentRank: null, previousRank: r.rank });
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const feed: DailyFeed = {
    userId,
    date,
    entries,
    totalNew: entries.filter((e) => e.type === 'new').length,
    totalChanged: entries.filter((e) => e.type === 'rank_changed').length,
    totalRemoved: entries.filter((e) => e.type === 'removed').length,
    generatedAt: new Date().toISOString(),
  };

  await db.doc(`job_feeds/${userId}/daily/${date}`).set(feed);

  // Save current as "prev" for next run
  await db.doc(`ranked_lists_prev/${userId}`).set({
    rankings: current.rankings,
    generatedAt: current.generatedAt,
  });

  return feed;
}
