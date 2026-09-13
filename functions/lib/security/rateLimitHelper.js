"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWindowStart = exports.RATE_LIMITS = void 0;
exports.RATE_LIMITS = {
    create_listing: { max: 5, windowSeconds: 3600 },
    send_message: { max: 30, windowSeconds: 60 },
    initiate_payment: { max: 5, windowSeconds: 60 },
    api_call: { max: 60, windowSeconds: 60 },
};
function getWindowStart(nowMs, windowSeconds) {
    const windowMs = windowSeconds * 1000;
    return Math.floor(nowMs / windowMs) * windowMs;
}
exports.getWindowStart = getWindowStart;
//# sourceMappingURL=rateLimitHelper.js.map