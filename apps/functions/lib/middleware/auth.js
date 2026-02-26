"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = verifyAuth;
const auth_1 = require("firebase-admin/auth");
/**
 * Verify Firebase ID token from Authorization header.
 * Returns decoded user or sends 401 and returns null.
 */
async function verifyAuth(req, res) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing auth token' } });
        return null;
    }
    try {
        const token = header.split('Bearer ')[1];
        const decoded = await (0, auth_1.getAuth)().verifyIdToken(token);
        return { uid: decoded.uid, email: decoded.email ?? '' };
    }
    catch {
        res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
        return null;
    }
}
//# sourceMappingURL=auth.js.map