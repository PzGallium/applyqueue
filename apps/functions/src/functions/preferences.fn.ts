/**
 * User Preferences API
 *
 * GET  /api/preferences — get current user preferences
 * PUT  /api/preferences — update user preferences
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const db = getFirestore();

export const preferencesApi = onRequest(async (req, res) => {
  const user = await verifyAuth(req, res);
  if (!user) return;

  const docRef = db.doc(`users/${user.uid}`);

  if (req.method === 'GET') {
    const doc = await docRef.get();
    const data = doc.exists ? doc.data() : null;
    const prefs = data?.preferences ?? {};
    const profile = data?.profile ?? null;
    success(res, 200, { preferences: prefs, profile });
    return;
  }

  if (req.method === 'PUT') {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      error(res, 400, 'INVALID_BODY', 'Request body must be a JSON object');
      return;
    }

    const allowed = [
      'targetRoles', 'targetLocations', 'minSalary', 'companySize',
      'industries', 'excludeCompanies', 'autoRankWeights',
      'roleKeywords', 'techKeywords', 'locationPriorities',
      'targetLevels', 'priorityCompanies', 'batchSize',
    ];

    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        update[`preferences.${key}`] = body[key];
      }
    }

    if ('resumeStyleReference' in body) {
      if (typeof body.resumeStyleReference !== 'string') {
        error(res, 400, 'INVALID_BODY', 'resumeStyleReference must be a string');
        return;
      }
      update['profile.resumeStyleReference'] = body.resumeStyleReference;
    }

    if (Object.keys(update).length === 0) {
      error(res, 400, 'NO_FIELDS', 'No valid preference fields provided');
      return;
    }

    update['updatedAt'] = new Date().toISOString();

    await docRef.set(update, { merge: true });
    const snap = await docRef.get();
    const data = snap.data();
    success(res, 200, {
      preferences: data?.preferences ?? {},
      profile: data?.profile ?? null,
    });
    return;
  }

  error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET or PUT');
});
