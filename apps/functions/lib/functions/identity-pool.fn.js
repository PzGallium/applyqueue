"use strict";
/**
 * Identity Pool API
 *
 * GET    /api/identity-pool — list all identity entries
 * POST   /api/identity-pool — create new entry
 * PUT    /api/identity-pool — update entry
 * DELETE /api/identity-pool — delete entry
 * PATCH  /api/identity-pool — set default identity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityPoolApi = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const shared_1 = require("@applyqueue/shared");
const auth_1 = require("../middleware/auth");
const response_1 = require("../utils/response");
const db = (0, firestore_1.getFirestore)();
function generateId() {
    return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}
exports.identityPoolApi = (0, https_1.onRequest)(async (req, res) => {
    const user = await (0, auth_1.verifyAuth)(req, res);
    if (!user)
        return;
    const docRef = db.doc(`identity_profiles/${user.uid}`);
    if (req.method === 'GET') {
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : null;
        const items = data?.items ?? [];
        const defaultId = data?.defaultId ?? null;
        (0, response_1.success)(res, 200, { items, defaultId });
        return;
    }
    if (req.method === 'POST') {
        const parsed = shared_1.identityCreateSchema.safeParse(req.body);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'INVALID_INPUT', parsed.error.message);
            return;
        }
        const { name, email, phone, label } = parsed.data;
        const id = generateId();
        const now = new Date().toISOString();
        const entry = {
            id,
            name,
            email,
            phone,
            label: label ?? '',
            createdAt: now,
            updatedAt: now,
        };
        const doc = await docRef.get();
        const current = (doc.exists ? doc.data() : {});
        const items = [...(current.items ?? []), entry];
        const defaultId = current.defaultId ?? (items.length === 1 ? id : null);
        await docRef.set({ userId: user.uid, items, defaultId, updatedAt: now }, { merge: true });
        (0, response_1.success)(res, 200, { item: entry, items, defaultId });
        return;
    }
    if (req.method === 'PUT') {
        const parsed = shared_1.identityUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'INVALID_INPUT', parsed.error.message);
            return;
        }
        const { id, ...updates } = parsed.data;
        if (Object.keys(updates).length === 0) {
            (0, response_1.error)(res, 400, 'INVALID_INPUT', 'No fields to update');
            return;
        }
        const doc = await docRef.get();
        if (!doc.exists) {
            (0, response_1.error)(res, 404, 'NOT_FOUND', 'Identity pool not found');
            return;
        }
        const data = doc.data();
        const items = data.items ?? [];
        const idx = items.findIndex((e) => e.id === id);
        if (idx < 0) {
            (0, response_1.error)(res, 404, 'NOT_FOUND', `Identity ${id} not found`);
            return;
        }
        const now = new Date().toISOString();
        items[idx] = { ...items[idx], ...updates, updatedAt: now };
        await docRef.update({ items, updatedAt: now });
        (0, response_1.success)(res, 200, { item: items[idx], items });
        return;
    }
    if (req.method === 'DELETE') {
        const parsed = shared_1.identityDeleteSchema.safeParse(req.body ?? req.query);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'INVALID_INPUT', parsed.error.message);
            return;
        }
        const { id } = parsed.data;
        const doc = await docRef.get();
        if (!doc.exists) {
            (0, response_1.success)(res, 200, { items: [], defaultId: null });
            return;
        }
        const data = doc.data();
        const items = (data.items ?? []).filter((e) => e.id !== id);
        let defaultId = data.defaultId;
        if (defaultId === id)
            defaultId = items.length > 0 ? items[0].id : null;
        const now = new Date().toISOString();
        await docRef.set({ userId: user.uid, items, defaultId, updatedAt: now }, { merge: true });
        (0, response_1.success)(res, 200, { items, defaultId });
        return;
    }
    if (req.method === 'PATCH') {
        const parsed = shared_1.identitySetDefaultSchema.safeParse(req.body);
        if (!parsed.success) {
            (0, response_1.error)(res, 400, 'INVALID_INPUT', parsed.error.message);
            return;
        }
        const { id } = parsed.data;
        const doc = await docRef.get();
        const data = doc.exists ? doc.data() : { items: [], defaultId: null };
        const items = data.items ?? [];
        const defaultId = id === null ? null : items.some((e) => e.id === id) ? id : data.defaultId;
        const now = new Date().toISOString();
        await docRef.set({ userId: user.uid, items, defaultId, updatedAt: now }, { merge: true });
        (0, response_1.success)(res, 200, { defaultId });
        return;
    }
    (0, response_1.error)(res, 405, 'METHOD_NOT_ALLOWED', 'Use GET, POST, PUT, DELETE, or PATCH');
});
//# sourceMappingURL=identity-pool.fn.js.map