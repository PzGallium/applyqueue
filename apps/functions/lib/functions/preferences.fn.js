"use strict";
/**
 * User Preferences API
 *
 * GET  /api/preferences — get current user preferences
 * PUT  /api/preferences — update user preferences
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferencesApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const db = (0, firestore_1.getFirestore)();
exports.preferencesApi = (0, https_1.onRequest)(async (req, res) => {
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const docRef = db.doc(`users/${user.uid}`);
    if (req.method === 'GET') {
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : null;
        const prefs = data?.preferences ?? {};
        const profile = data?.profile ?? null;
        (0, response_1.success)(res, 200, { preferences: prefs, profile });
        return;
    }
    if (req.method === 'PUT') {
        const body = req.body;
        if (!body || typeof body !== 'object') {
            (0, response_1.error)(res, 400, 'INVALID_BODY', 'Request body must be a JSON object');
            return;
        }
        const allowed = [
            'targetRoles', 'targetLocations', 'minSalary', 'companySize',
            'industries', 'excludeCompanies', 'autoRankWeights',
            'roleKeywords', 'techKeywords', 'locationPriorities',
            'targetLevels', 'priorityCompanies', 'batchSize',
        ];
        const update = {};
        for (const key of allowed) {
            if (key in body) {
                update[`preferences.${key}`] = body[key];
            }
        }
        if ('resumeStyleReference' in body) {
            if (typeof body.resumeStyleReference !== 'string') {
                (0, response_1.error)(res, 400, 'INVALID_BODY', 'resumeStyleReference must be a string');
                return;
            }
            update['profile.resumeStyleReference'] = body.resumeStyleReference;
        }
        if (Object.keys(update).length === 0) {
            (0, response_1.error)(res, 400, 'NO_FIELDS', 'No valid preference fields provided');
            return;
        }
        update['updatedAt'] = new Date().toISOString();
        await docRef.set(update, { merge: true });
        const snap = await docRef.get();
        const data = snap.data();
        (0, response_1.success)(res, 200, {
            preferences: data?.preferences ?? {},
            profile: data?.profile ?? null,
        });
        return;
    }
    (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET or PUT');
});
//# sourceMappingURL=preferences.fn.js.map