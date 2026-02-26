"use strict";
/**
 * Cloud Functions for the user project pool CRUD.
 *
 * POST /api/projects       — create a project
 * GET  /api/projects       — list user's projects
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectsApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const db = (0, firestore_1.getFirestore)();
const col = () => db.collection('projects');
exports.projectsApi = (0, https_1.onRequest)(async (req, res) => {
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    // ---- POST /api/projects ----
    if (req.method === 'POST') {
        const parsed = shared_1.userProjectSchema.safeParse(req.body);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'VALIDATION_ERROR', parsed.error.message);
            return;
        }
        const docRef = col().doc();
        const project = {
            id: docRef.id,
            userId: user.uid,
            ...parsed.data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        await docRef.set(project);
        (0, response_1.success)(res, 201, project);
        return;
    }
    // ---- GET /api/projects ----
    if (req.method === 'GET') {
        const snap = await col()
            .where('userId', '==', user.uid)
            .orderBy('updatedAt', 'desc')
            .get();
        const projects = snap.docs.map((d) => d.data());
        (0, response_1.success)(res, 200, { projects });
        return;
    }
    (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET or POST');
});
//# sourceMappingURL=projects.fn.js.map