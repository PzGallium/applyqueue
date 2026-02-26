"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDelta = computeDelta;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
/**
 * Compare current ranked list with the previous one and produce a delta feed.
 * Stores result in job_feeds/{userId}/daily/{YYYY-MM-DD}.
 */
async function computeDelta(userId, current) {
    const prevDoc = await db.doc(`ranked_lists_prev/${userId}`).get();
    const prevRankings = prevDoc.exists
        ? prevDoc.data().rankings ?? []
        : [];
    const prevMap = new Map(prevRankings.map((r) => [r.jobId, r]));
    const currentMap = new Map(current.rankings.map((r) => [r.jobId, r]));
    const entries = [];
    for (const r of current.rankings) {
        const prev = prevMap.get(r.jobId);
        if (!prev) {
            entries.push({ jobId: r.jobId, type: 'new', currentRank: r.rank, previousRank: null });
        }
        else if (prev.rank !== r.rank) {
            entries.push({ jobId: r.jobId, type: 'rank_changed', currentRank: r.rank, previousRank: prev.rank });
        }
    }
    for (const r of prevRankings) {
        if (!currentMap.has(r.jobId)) {
            entries.push({ jobId: r.jobId, type: 'removed', currentRank: null, previousRank: r.rank });
        }
    }
    const date = new Date().toISOString().slice(0, 10);
    const feed = {
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
//# sourceMappingURL=delta.js.map