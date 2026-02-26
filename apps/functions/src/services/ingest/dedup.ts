import { getFirestore } from 'firebase-admin/firestore';
import type { Job } from '@applyqueue/shared';

const db = getFirestore();
const jobsCol = () => db.collection('jobs');

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
export async function dedupJobs(jobs: Job[]): Promise<DedupResult> {
  if (jobs.length === 0) return { newJobs: [], updatedJobs: [], skipped: 0 };

  const hashes = jobs.map((j) => j.dedupeHash);
  const existingMap = new Map<string, { id: string; scrapedAt: string }>();

  const batchSize = 30;
  for (let i = 0; i < hashes.length; i += batchSize) {
    const chunk = hashes.slice(i, i + batchSize);
    const snap = await jobsCol().where('dedupeHash', 'in', chunk).get();
    snap.docs.forEach((doc) => {
      const data = doc.data();
      existingMap.set(data.dedupeHash, { id: doc.id, scrapedAt: data.scrapedAt });
    });
  }

  const newJobs: Job[] = [];
  const updatedJobs: Job[] = [];
  let skipped = 0;

  const batch = db.batch();

  for (const job of jobs) {
    const existing = existingMap.get(job.dedupeHash);
    if (!existing) {
      const ref = jobsCol().doc();
      const withId = { ...job, id: ref.id };
      batch.set(ref, withId);
      newJobs.push(withId);
    } else {
      const ref = jobsCol().doc(existing.id);
      batch.update(ref, {
        scrapedAt: job.scrapedAt,
        isActive: true,
        rawDescription: job.rawDescription,
      });
      updatedJobs.push({ ...job, id: existing.id });
      skipped++;
    }
  }

  await batch.commit();
  return { newJobs, updatedJobs, skipped };
}
