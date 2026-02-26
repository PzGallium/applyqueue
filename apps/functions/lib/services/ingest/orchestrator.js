"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnector = getConnector;
exports.registerConnector = registerConnector;
exports.runIngestPipeline = runIngestPipeline;
const firestore_1 = require("firebase-admin/firestore");
const greenhouse_1 = require("./connectors/greenhouse");
const lever_1 = require("./connectors/lever");
const brave_search_1 = require("./connectors/brave-search");
const normalizer_1 = require("./normalizer");
const dedup_1 = require("./dedup");
const ranker_1 = require("./ranker");
const delta_1 = require("./delta");
const db = (0, firestore_1.getFirestore)();
const connectors = {
    greenhouse: greenhouse_1.greenhouseConnector,
    lever: lever_1.leverConnector,
    custom: brave_search_1.braveSearchConnector,
};
function getConnector(type) {
    return connectors[type] ?? null;
}
function registerConnector(type, connector) {
    connectors[type] = connector;
}
async function fetchFromSource(config) {
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
        const normalized = await Promise.all(rawJobs.map(normalizer_1.normalizeJob));
        const { newJobs, updatedJobs, skipped } = await (0, dedup_1.dedupJobs)(normalized);
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
    }
    catch (err) {
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
async function runIngestPipeline() {
    // 1. Fetch all enabled job sources
    const sourcesSnap = await db.collection('job_sources')
        .where('isEnabled', '==', true)
        .get();
    const configs = sourcesSnap.docs.map((d) => ({ ...d.data(), id: d.id }));
    // Run all source fetches in parallel (batched by connector type)
    const results = await Promise.all(configs.map(fetchFromSource));
    const totalNew = results.reduce((a, r) => a + r.newJobs, 0);
    // 2. Re-rank users (only if there are new/updated jobs)
    let usersRanked = 0;
    if (totalNew > 0) {
        const usersSnap = await db.collection('users').get();
        for (const userDoc of usersSnap.docs) {
            try {
                const rankedList = await (0, ranker_1.rankJobsForUser)(userDoc.id);
                await (0, delta_1.computeDelta)(userDoc.id, rankedList);
                usersRanked++;
            }
            catch {
                // log and continue
            }
        }
    }
    return { sources: results, usersRanked };
}
//# sourceMappingURL=orchestrator.js.map