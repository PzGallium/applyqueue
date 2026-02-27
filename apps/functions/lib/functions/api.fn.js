"use strict";
/**
 * Catch-all for /api/** when no specific rewrite matches.
 * Returns 404 so Hosting has a valid function to invoke.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const https_1 = require("firebase-functions/v2/https");
exports.api = (0, https_1.onRequest)((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        code: 'NOT_FOUND',
        path: req.path,
        message: `No API handler for ${req.method} ${req.path}`,
    });
});
//# sourceMappingURL=api.fn.js.map