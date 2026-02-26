import type { Job, JobSource, LocationType, JobLevel } from '@applyqueue/shared';
import { generateDedupeHash } from '@applyqueue/shared';
import type { RawJob } from './connectors/types';

const REMOTE_PATTERNS = /\bremote\b/i;
const HYBRID_PATTERNS = /\bhybrid\b/i;

const ENTRY_PATTERNS = /\b(new grad|entry.level|junior|intern|new.college|early.career|associate|0.?[–-].?2.?years?)\b/i;
const MID_PATTERNS = /\b(mid.?level|intermediate|3.?[–-].?5.?years?)\b/i;
const SENIOR_PATTERNS = /\b(senior|sr\.?|lead|principal|staff|5\+.?years?)\b/i;

function inferLocationType(location: string, description: string): LocationType {
  const text = `${location} ${description}`;
  if (REMOTE_PATTERNS.test(text)) return 'remote';
  if (HYBRID_PATTERNS.test(text)) return 'hybrid';
  return 'onsite';
}

function inferLevel(title: string, description: string): JobLevel {
  const text = `${title} ${description}`;
  if (SENIOR_PATTERNS.test(text)) return 'senior';
  if (MID_PATTERNS.test(text)) return 'mid';
  if (ENTRY_PATTERNS.test(text)) return 'entry';
  return 'entry';
}

function inferSource(raw: RawJob): JobSource {
  const src = (raw.metadata?.source as string) ?? '';
  if (src === 'greenhouse') return 'greenhouse';
  if (src === 'lever') return 'lever';
  if (src === 'ashby') return 'ashby';
  if (src === 'rss') return 'rss';
  return 'manual';
}

export async function normalizeJob(raw: RawJob): Promise<Job> {
  const dedupeHash = await generateDedupeHash(raw.title, raw.company, raw.location);
  const now = new Date().toISOString();

  return {
    id: '',
    title: raw.title.trim(),
    company: raw.company.trim(),
    companyLogo: null,
    location: raw.location.trim(),
    locationType: inferLocationType(raw.location, raw.description),
    url: raw.url,
    source: inferSource(raw),
    sourceId: raw.externalId,
    dedupeHash,
    salary: { min: null, max: null, currency: 'USD' },
    tags: [],
    level: inferLevel(raw.title, raw.description),
    postedAt: raw.postedAt ?? now,
    scrapedAt: now,
    expiresAt: null,
    isActive: true,
    rawDescription: raw.description,
  };
}
