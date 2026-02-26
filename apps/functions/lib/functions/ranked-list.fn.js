"use strict";
/**
 * Ranked List API
 *
 * GET /api/ranked-list — get current user's ranked jobs with full job details
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rankedListApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const db = (0, firestore_1.getFirestore)();
const IN_CHUNK = 10;
async function getJobsByIds(jobIds) {
    const map = new Map();
    for (let i = 0; i < jobIds.length; i += IN_CHUNK) {
        const chunk = jobIds.slice(i, i + IN_CHUNK);
        const snap = await db.collection('jobs').where(firestore_1.FieldPath.documentId(), 'in', chunk).get();
        snap.docs.forEach((d) => map.set(d.id, d.data()));
    }
    return map;
}
exports.rankedListApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'GET') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const listDoc = await db.doc(`ranked_lists/${user.uid}`).get();
    if (!listDoc.exists) {
        (0, response_1.success)(res, 200, {
            list: null,
            items: [],
            generatedAt: null,
        });
        return;
    }
    const list = listDoc.data();
    const rankings = list.rankings ?? [];
    if (rankings.length === 0) {
        (0, response_1.success)(res, 200, {
            list: { ...list, rankings: [] },
            items: [],
            generatedAt: list.generatedAt ?? null,
        });
        return;
    }
    const jobIds = rankings.map((r) => r.jobId);
    const jobsMap = await getJobsByIds(jobIds);
    const items = rankings.map((r) => ({
        rank: r.rank,
        score: r.score,
        scoreBreakdown: r.scoreBreakdown,
        addedAt: r.addedAt,
        job: jobsMap.get(r.jobId) ?? null,
    }));
    (0, response_1.success)(res, 200, {
        list: {
            userId: list.userId,
            totalJobs: list.totalJobs,
            generatedAt: list.generatedAt,
            filters: list.filters,
        },
        items,
        generatedAt: list.generatedAt ?? null,
    });
});
//# sourceMappingURL=ranked-list.fn.js.map