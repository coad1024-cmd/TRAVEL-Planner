"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCorrelationId = createCorrelationId;
exports.createAgentMessage = createAgentMessage;
exports.addMoney = addMoney;
exports.zeroCurrency = zeroCurrency;
exports.formatMoney = formatMoney;
exports.parseLatLng = parseLatLng;
exports.parseISODate = parseISODate;
exports.daysBetween = daysBetween;
exports.sleep = sleep;
exports.withRetry = withRetry;
const crypto_1 = require("crypto");
function createCorrelationId() {
    return (0, crypto_1.randomUUID)();
}
function createAgentMessage(from, to, type, payload, options = {}) {
    return {
        from,
        to,
        type,
        correlation_id: createCorrelationId(),
        timestamp: new Date().toISOString(),
        payload,
        confidence: options.confidence ?? 1.0,
        requires_human_confirmation: options.requires_human_confirmation ?? false,
        errors: options.errors ?? [],
    };
}
function addMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
    }
    return {
        amount: a.amount + b.amount,
        currency: a.currency,
        amount_usd: a.amount_usd !== undefined && b.amount_usd !== undefined
            ? a.amount_usd + b.amount_usd
            : undefined,
    };
}
function zeroCurrency(currency) {
    return { amount: 0, currency, amount_usd: 0 };
}
function formatMoney(money) {
    return `${money.currency} ${money.amount.toLocaleString('en-IN')}`;
}
/** Parse "lat,lng" string into {lat, lng} */
function parseLatLng(str) {
    const [lat, lng] = str.split(',').map(Number);
    if (isNaN(lat) || isNaN(lng))
        throw new Error(`Invalid lat,lng: ${str}`);
    return { lat, lng };
}
/** ISO date (YYYY-MM-DD) → Date object (UTC midnight) */
function parseISODate(dateStr) {
    return new Date(`${dateStr}T00:00:00Z`);
}
/** Days between two ISO dates */
function daysBetween(start, end) {
    const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
}
/** Sleep for ms milliseconds */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/** Exponential backoff retry */
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 500) {
    let lastError = new Error('No attempts made');
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < maxAttempts - 1) {
                await sleep(baseDelayMs * Math.pow(2, attempt));
            }
        }
    }
    throw lastError;
}
//# sourceMappingURL=utils.js.map