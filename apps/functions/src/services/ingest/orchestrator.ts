import { getFirestore } from 'firebase-admin/firestore';
import type { JobSourceConfig } from '@applyqueue/shared';
import type { RawJob, IngestResult, SourceConnector } from './connectors/types';
import { greenhouseConnector } from './connectors/greenhouse';
import { leverConnector } from './connectors/lever';
import { braveSearchConnector } from './connectors/brave-search';
import { normalizeJob } from './normalizer';
import { dedupJobs } from './dedup';
import { rankJobsForUser } from './ranker';
import { computeDelta } from './delta';

const db = getFirestore();

const connectors: Record<string, SourceConnector> = {
  greenhouse: greenhouseConnector,
  lever: leverConnector,
  custom: braveSearchConnector,
};

export function getConnector(type: string): SourceConnector | null {
  return connectors[type] ?? null;
}

export function registerConnector(type: string, connector: SourceConnector): void {
  connectors[type] = connector;
}

async function fetchFromSource(config: JobSourceConfig): Promise<IngestResult> {
  const connector = getConnector(config.type);
  if (!connector) {
    return {
      source: config.name,
      fetched: 0,
      newJobs: 0,
      updatedJobs: 0,
      errors: [`No connector for type: ${config.type}`],
    };
  }

  try {
    const rawJobs = await connector.fetch(config);
    const normalized = await Promise.all(rawJobs.map(normalizeJob));
    const { newJobs, updatedJobs, skipped } = await dedupJobs(normalized);

    await db.doc(`job_sources/${config.id}`).update({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'success',
      jobCount: rawJobs.length,
      updatedAt: new Date().toISOString(),
    });

    return {
      source: config.name,
      fetched: rawJobs.length,
      newJobs: newJobs.length,
      updatedJobs: updatedJobs.length,
      errors: [],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    await db.doc(`job_sources/${config.id}`).update({
      lastRunAt: new Date().toISOString(),
      lastRunStatus: 'error',
      updatedAt: new Date().toISOString(),
    });

    return {
      source: config.name,
      fetched: 0,
      newJobs: 0,
      updatedJobs: 0,
      errors: [message],
    };
  }
}

/**
 * Run the full ingest pipeline:
 * 1. Fetch all enabled sources
 * 2. Re-rank for all users who have preferences
 * 3. Compute delta feeds
 */
export async function runIngestPipeline(): Promise<{
  sources: IngestResult[];
  usersRanked: number;
}> {
  // 1. Fetch all enabled job sources
  const sourcesSnap = await db.collection('job_sources')
    .where('isEnabled', '==', true)
    .get();

  const configs = sourcesSnap.docs.map((d) => ({ ...d.data(), id: d.id }) as JobSourceConfig);

  // Run all source fetches in parallel (batched by connector type)
  const results = await Promise.all(configs.map(fetchFromSource));

  const totalNew = results.reduce((a, r) => a + r.newJobs, 0);

  // 2. Re-rank users (only if there are new/updated jobs)
  let usersRanked = 0;
  if (totalNew > 0) {
    const usersSnap = await db.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      try {
        const rankedList = await rankJobsForUser(userDoc.id);
        await computeDelta(userDoc.id, rankedList);
        usersRanked++;
      } catch {
        // log and continue
      }
    }
  }

  return { sources: results, usersRanked };
}
