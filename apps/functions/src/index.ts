import path from 'path';
import { config as loadEnv } from 'dotenv';

// Load .env.local / .env from project root when running (e.g. Firebase emulator)
loadEnv({ path: path.join(__dirname, '..', '..', '..', '.env.local') });
loadEnv({ path: path.join(__dirname, '..', '..', '..', '.env') });

import { initializeApp } from 'firebase-admin/app';

initializeApp();

// Keys & OAuth
export {
  oauthAuthorizeApi,
  oauthCallbackApi,
  keyPutApi,
  keyValidateApi,
  keyListApi,
  keyDeleteApi,
} from './functions/keys.fn';

// Job Sources
export { jobSourcesApi } from './functions/job-sources.fn';

// Ingest Pipeline
export { ingestScheduled, ingestTriggerApi } from './functions/ingest.fn';

// User Preferences
export { preferencesApi } from './functions/preferences.fn';

// Ranked List (Dashboard) — deprecated
export { rankedListApi } from './functions/ranked-list.fn';

// Resume Refine
export { resumeRefineApi } from './functions/resume-refine.fn';

// Identity Pool
export { identityPoolApi } from './functions/identity-pool.fn';

// Projects
export { projectsApi } from './functions/projects.fn';

// Project Intelligence
export {
  jdParseApi,
  projectMatchRunApi,
  projectMatchGetApi,
} from './functions/project-intel.fn';

// Apply
export { applyApi } from './functions/apply.fn';
export { applicationsApi } from './functions/applications.fn';
