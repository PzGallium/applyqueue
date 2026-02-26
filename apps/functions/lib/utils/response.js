"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = success;
exports.error = error;
function success(res, status, data) {
    res.status(status).json(data);
}
function error(res, status, code, message) {
    res.status(status).json({ error: { code, message } });
}
//# sourceMappingURL=response.js.map