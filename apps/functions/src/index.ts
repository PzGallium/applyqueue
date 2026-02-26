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

// Ranked List (Dashboard)
export { rankedListApi } from './functions/ranked-list.fn';

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
