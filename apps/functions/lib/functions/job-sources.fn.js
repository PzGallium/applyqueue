"use strict";
/**
 * Job Source Management CRUD API.
 *
 * POST   /api/job-sources       — add a new source to monitor
 * GET    /api/job-sources       — list configured sources for current user
 * DELETE /api/job-sources       — remove a source (query param: sourceId)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobSourcesApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const db = (0, firestore_1.getFirestore)();
const col = () => db.collection('job_sources');
exports.jobSourcesApi = (0, https_1.onRequest)(async (req, res) => {
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    if (req.method === 'POST') {
        const parsed = shared_1.jobSourceCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
            return;
        }
        const ref = col().doc();
        const now = new Date().toISOString();
        const source = {
            id: ref.id,
            ...parsed.data,
            isEnabled: true,
            lastRunAt: null,
            lastRunStatus: null,
            jobCount: 0,
            createdAt: now,
            updatedAt: now,
        };
        await ref.set({ ...source, userId: user.uid });
        (0, response_1.success)(res, 201, source);
        return;
    }
    if (req.method === 'GET') {
        const snap = await col()
            .where('userId', '==', user.uid)
            .orderBy('createdAt', 'desc')
            .get();
        const sources = snap.docs.map((d) => {
            const data = d.data();
            delete data.userId;
            return data;
        });
        (0, response_1.success)(res, 200, { sources });
        return;
    }
    if (req.method === 'DELETE') {
        const parsed = shared_1.jobSourceDeleteSchema.safeParse(req.query);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'VALIDATION_ERROR', 'Missing sourceId query param');
            return;
        }
        const { sourceId } = parsed.data;
        const docRef = col().doc(sourceId);
        const doc = await docRef.get();
        if (!doc.exists) {
            (0, response_1.error)(res, 404, 'NOT_FOUND', 'Source not found');
            return;
        }
        if (doc.data()?.userId !== user.uid) {
            (0, response_1.error)(res, 403, 'FORBIDDEN', 'Not your source');
            return;
        }
        await docRef.delete();
        (0, response_1.success)(res, 200, { deleted: true, sourceId });
        return;
    }
    (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET, POST, or DELETE');
});
//# sourceMappingURL=job-sources.fn.js.map