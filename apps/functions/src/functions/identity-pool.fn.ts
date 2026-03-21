/**
 * Identity Pool API
 *
 * GET    /api/identity-pool — list all identity entries
 * POST   /api/identity-pool — create new entry
 * PUT    /api/identity-pool — update entry
 * DELETE /api/identity-pool — delete entry
 * PATCH  /api/identity-pool — set default identity
 */

import { onRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import type { IdentityEntry, IdentityPool } from '@applyqueue/shared';
import {
  identityCreateSchema,
  identityUpdateSchema,
  identityDeleteSchema,
  identitySetDefaultSchema,
} from '@applyqueue/shared';
import { verifyAuth } from '../middleware/auth';
import { success, error } from '../utils/response';

const db = getFirestore();

function generateId(): string {
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export const identityPoolApi = onRequest(async (req, res) => {
  const user = await verifyAuth(req, res);
  if (!user) return;

  const docRef = db.doc(`identity_profiles/${user.uid}`);

  if (req.method === 'GET') {
    const doc = await docRef.get();
    const data = doc.exists ? (doc.data() as IdentityPool) : null;
    const rawItems = data?.items ?? [];
    const items: IdentityEntry[] = rawItems.map((e) => ({
      ...e,
      location: e.location ?? '',
      label: e.label ?? '',
    }));
    const defaultId = data?.defaultId ?? null;
    success(res, 200, { items, defaultId });
    return;
  }

  if (req.method === 'POST') {
    const parsed = identityCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 400, 'INVALID_INPUT', parsed.error.message);
      return;
    }
    const { name, email, phone, label, location } = parsed.data;
    const id = generateId();
    const now = new Date().toISOString();
    const entry: IdentityEntry = {
      id,
      name,
      email,
      phone,
      location: location ?? '',
      label: label ?? '',
      createdAt: now,
      updatedAt: now,
    };

    const doc = await docRef.get();
    const current = (doc.exists ? doc.data() : {}) as { items?: IdentityEntry[]; defaultId?: string | null };
    const items = [...(current.items ?? []), entry];
    const defaultId = current.defaultId ?? (items.length === 1 ? id : null);

    await docRef.set({ userId: user.uid, items, defaultId, updatedAt: now }, { merge: true });
    success(res, 200, { item: entry, items, defaultId });
    return;
  }

  if (req.method === 'PUT') {
    const parsed = identityUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 400, 'INVALID_INPUT', parsed.error.message);
      return;
    }
    const { id, ...updates } = parsed.data;
    if (Object.keys(updates).length === 0) {
      error(res, 400, 'INVALID_INPUT', 'No fields to update');
      return;
    }

    const doc = await docRef.get();
    if (!doc.exists) {
      error(res, 404, 'NOT_FOUND', 'Identity pool not found');
      return;
    }
    const data = doc.data() as IdentityPool;
    const items = data.items ?? [];
    const idx = items.findIndex((e) => e.id === id);
    if (idx < 0) {
      error(res, 404, 'NOT_FOUND', `Identity ${id} not found`);
      return;
    }
    const now = new Date().toISOString();
    items[idx] = { ...items[idx], ...updates, updatedAt: now };

    await docRef.update({ items, updatedAt: now });
    success(res, 200, { item: items[idx], items });
    return;
  }

  if (req.method === 'DELETE') {
    const parsed = identityDeleteSchema.safeParse(req.body ?? req.query);
    if (!parsed.success) {
      error(res, 400, 'INVALID_INPUT', parsed.error.message);
      return;
    }
    const { id } = parsed.data;

    const doc = await docRef.get();
    if (!doc.exists) {
      success(res, 200, { items: [], defaultId: null });
      return;
    }
    const data = doc.data() as IdentityPool;
    const items = (data.items ?? []).filter((e) => e.id !== id);
    let defaultId = data.defaultId;
    if (defaultId === id) defaultId = items.length > 0 ? items[0].id : null;

    const now = new Date().toISOString();
    await docRef.set({ userId: user.uid, items, defaultId, updatedAt: now }, { merge: true });
    success(res, 200, { items, defaultId });
    return;
  }

  if (req.method === 'PATCH') {
    const parsed = identitySetDefaultSchema.safeParse(req.body);
    if (!parsed.success) {
      error(res, 400, 'INVALID_INPUT', parsed.error.message);
      return;
    }
    const { id } = parsed.data;

    const doc = await docRef.get();
    const data = doc.exists ? (doc.data() as IdentityPool) : { items: [], defaultId: null };
    const items = data.items ?? [];
    const defaultId = id === null ? null : items.some((e) => e.id === id) ? id : data.defaultId;

    const now = new Date().toISOString();
    await docRef.set({ userId: user.uid, items, defaultId, updatedAt: now }, { merge: true });
    success(res, 200, { defaultId });
    return;
  }

  error(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET, POST, PUT, DELETE, or PATCH');
});
