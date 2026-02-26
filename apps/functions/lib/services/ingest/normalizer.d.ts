import type { Job } from '@applyqueue/shared';
import type { RawJob } from './connectors/types';
export declare function normalizeJob(raw: RawJob): Promise<Job>;
