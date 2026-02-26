/**
 * Cloud Functions for the user project pool CRUD.
 *
 * POST /api/projects       — create a project
 * GET  /api/projects       — list user's projects
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { userProjectSchema } from '@applyqueue/shared';
import type { UserProject } from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const db = getFirestore();
const col = () => db.collection('projects');

export const projectsApi = onRequest(async (req, res) => {
  const user = await verifyAuth(req, res);
  if (!user) return;

  // ---- POST /api/projects ----
  if (req.method === 'POST') {
    const parsed = userProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 400, 'VALIDATION_ERROR', parsed.error.message);
      return;
    }

    const docRef = col().doc();
    const project: UserProject = {
      id: docRef.id,
      userId: user.uid,
      ...parsed.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await docRef.set(project);
    success(res, 201, project);
    return;
  }

  // ---- GET /api/projects ----
  if (req.method === 'GET') {
    const snap = await col()
      .where('userId', '==', user.uid)
      .orderBy('updatedAt', 'desc')
      .get();

    const projects = snap.docs.map((d) => d.data() as UserProject);
    success(res, 200, { projects });
    return;
  }

  error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET or POST');
});
