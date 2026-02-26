"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dedupJobs = dedupJobs;
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)();
const jobsCol = () => db.collection('jobs');
/**
 * Dedup a batch of normalized jobs against the Firestore `jobs` collection.
 * - New hash → insert
 * - Same hash, content changed → update
 * - Same hash, no change → skip
 */
async function dedupJobs(jobs) {
    if (jobs.length === 0)
        return { newJobs: [], updatedJobs: [], skipped: 0 };
    const hashes = jobs.map((j) => j.dedupeHash);
    const existingMap = new Map();
    const batchSize = 30;
    for (let i = 0; i < hashes.length; i += batchSize) {
        const chunk = hashes.slice(i, i + batchSize);
        const snap = await jobsCol().where('dedupeHash', 'in', chunk).get();
        snap.docs.forEach((doc) => {
            const data = doc.data();
            existingMap.set(data.dedupeHash, { id: doc.id, scrapedAt: data.scrapedAt });
        });
    }
    const newJobs = [];
    const updatedJobs = [];
    let skipped = 0;
    const batch = db.batch();
    for (const job of jobs) {
        const existing = existingMap.get(job.dedupeHash);
        if (!existing) {
            const ref = jobsCol().doc();
            const withId = { ...job, id: ref.id };
            batch.set(ref, withId);
            newJobs.push(withId);
        }
        else {
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
//# sourceMappingURL=dedup.js.map