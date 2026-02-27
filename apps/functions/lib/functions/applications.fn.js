"use strict";
/**
 * Applications read API — list and get by ID (user-isolated).
 *
 * GET /api/applications       — list current user's applications (newest first)
 * GET /api/applications/:id   — get one application (must belong to user)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationsApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const db = (0, firestore_1.getFirestore)();
const LIST_LIMIT = 50;
exports.applicationsApi = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== 'GET') {
        (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET');
        return;
    }
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const pathParts = req.path.split('/').filter(Boolean);
    const applicationsIndex = pathParts.indexOf('applications');
    if (applicationsIndex === -1) {
        (0, response_1.error)(res, 404, 'NOT_FOUND', 'Path not found');
        return;
    }
    const applyId = pathParts[applicationsIndex + 1];
    if (applyId) {
        const doc = await db.collection('applications').doc(applyId).get();
        if (!doc.exists) {
            (0, response_1.error)(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
            return;
        }
        const data = doc.data();
        if (data.userId !== user.uid) {
            (0, response_1.error)(res, 404, 'APPLICATION_NOT_FOUND', 'Application not found');
            return;
        }
        (0, response_1.success)(res, 200, {
            id: doc.id,
            userId: data.userId,
            rankIndex: data.rankIndex,
            jobId: data.jobId,
            status: data.status,
            errorCode: data.errorCode ?? null,
            errorMessage: data.errorMessage ?? null,
            artifact: data['artifact.path'] != null ? { path: data['artifact.path'] } : null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        });
        return;
    }
    const snap = await db
        .collection('applications')
        .where('userId', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(LIST_LIMIT)
        .get();
    const applications = snap.docs.map((d) => {
        const data = d.data();
        return {
            id: d.id,
            userId: data.userId,
            rankIndex: data.rankIndex,
            jobId: data.jobId,
            status: data.status,
            errorCode: data.errorCode ?? null,
            errorMessage: data.errorMessage ?? null,
            artifact: data['artifact.path'] != null ? { path: data['artifact.path'] } : null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    });
    (0, response_1.success)(res, 200, { applications });
});
//# sourceMappingURL=applications.fn.js.map