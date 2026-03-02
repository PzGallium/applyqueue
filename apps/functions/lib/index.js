"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationsApi = exports.applyApi = exports.projectMatchGetApi = exports.projectMatchRunApi = exports.jdParseApi = exports.projectsApi = exports.identityPoolApi = exports.resumeRefineApi = exports.rankedListApi = exports.preferencesApi = exports.ingestTriggerApi = exports.ingestScheduled = exports.jobSourcesApi = exports.keyDeleteApi = exports.keyListApi = exports.keyValidateApi = exports.keyPutApi = exports.oauthCallbackApi = exports.oauthAuthorizeApi = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = require("dotenv");
// Load .env.local / .env from project root when running (e.g. Firebase emulator)
(0, dotenv_1.config)({ path: path_1.default.join(__dirname, '..', '..', '..', '.env.local') });
(0, dotenv_1.config)({ path: path_1.default.join(__dirname, '..', '..', '..', '.env') });
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
// Keys & OAuth
var keys_fn_1 = require("./functions/keys.fn");
Object.defineProperty(exports, "oauthAuthorizeApi", { enumerable: true, get: function () { return keys_fn_1.oauthAuthorizeApi; } });
Object.defineProperty(exports, "oauthCallbackApi", { enumerable: true, get: function () { return keys_fn_1.oauthCallbackApi; } });
Object.defineProperty(exports, "keyPutApi", { enumerable: true, get: function () { return keys_fn_1.keyPutApi; } });
Object.defineProperty(exports, "keyValidateApi", { enumerable: true, get: function () { return keys_fn_1.keyValidateApi; } });
Object.defineProperty(exports, "keyListApi", { enumerable: true, get: function () { return keys_fn_1.keyListApi; } });
Object.defineProperty(exports, "keyDeleteApi", { enumerable: true, get: function () { return keys_fn_1.keyDeleteApi; } });
// Job Sources
var job_sources_fn_1 = require("./functions/job-sources.fn");
Object.defineProperty(exports, "jobSourcesApi", { enumerable: true, get: function () { return job_sources_fn_1.jobSourcesApi; } });
// Ingest Pipeline
var ingest_fn_1 = require("./functions/ingest.fn");
Object.defineProperty(exports, "ingestScheduled", { enumerable: true, get: function () { return ingest_fn_1.ingestScheduled; } });
Object.defineProperty(exports, "ingestTriggerApi", { enumerable: true, get: function () { return ingest_fn_1.ingestTriggerApi; } });
// User Preferences
var preferences_fn_1 = require("./functions/preferences.fn");
Object.defineProperty(exports, "preferencesApi", { enumerable: true, get: function () { return preferences_fn_1.preferencesApi; } });
// Ranked List (Dashboard) — deprecated
var ranked_list_fn_1 = require("./functions/ranked-list.fn");
Object.defineProperty(exports, "rankedListApi", { enumerable: true, get: function () { return ranked_list_fn_1.rankedListApi; } });
// Resume Refine
var resume_refine_fn_1 = require("./functions/resume-refine.fn");
Object.defineProperty(exports, "resumeRefineApi", { enumerable: true, get: function () { return resume_refine_fn_1.resumeRefineApi; } });
// Identity Pool
var identity_pool_fn_1 = require("./functions/identity-pool.fn");
Object.defineProperty(exports, "identityPoolApi", { enumerable: true, get: function () { return identity_pool_fn_1.identityPoolApi; } });
// Projects
var projects_fn_1 = require("./functions/projects.fn");
Object.defineProperty(exports, "projectsApi", { enumerable: true, get: function () { return projects_fn_1.projectsApi; } });
// Project Intelligence
var project_intel_fn_1 = require("./functions/project-intel.fn");
Object.defineProperty(exports, "jdParseApi", { enumerable: true, get: function () { return project_intel_fn_1.jdParseApi; } });
Object.defineProperty(exports, "projectMatchRunApi", { enumerable: true, get: function () { return project_intel_fn_1.projectMatchRunApi; } });
Object.defineProperty(exports, "projectMatchGetApi", { enumerable: true, get: function () { return project_intel_fn_1.projectMatchGetApi; } });
// Apply
var apply_fn_1 = require("./functions/apply.fn");
Object.defineProperty(exports, "applyApi", { enumerable: true, get: function () { return apply_fn_1.applyApi; } });
var applications_fn_1 = require("./functions/applications.fn");
Object.defineProperty(exports, "applicationsApi", { enumerable: true, get: function () { return applications_fn_1.applicationsApi; } });
//# sourceMappingURL=index.js.map