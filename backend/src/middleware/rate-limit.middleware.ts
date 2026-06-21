import rateLimit from "express-rate-limit";

// Health endpoint limiter — 30 requests per 15 minutes per IP
// Prevents the /health endpoint from being abused for uptime-monitoring loops or DDoS.
export const healthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, statusCode: 429, message: "Too many health check requests." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only count failures against the limit
});

// General API rate limiter — 100 failed requests per 15 minutes per IP.
//
// WHY skipSuccessfulRequests: true?
// The dashboard loads multiple widgets in parallel (stats, vehicles, lenders, etc.),
// each firing its own API call. A strict count of ALL requests would let a legitimate
// user hit the 100-request cap mid-session and receive spurious 429 errors.
//
// With skipSuccessfulRequests: true:
//   - Successful (2xx) responses are NOT counted → real users are never blocked.
//   - Failed (4xx/5xx) responses ARE counted → attackers probing endpoints, sending
//     malformed requests, or attempting auth bypasses are still throttled.
//
// This is the correct production pattern: maximum security against bad actors,
// zero false positives for legitimate dashboard usage.
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, statusCode: 429, message: "Too many requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // only failed/error requests count — real users are never blocked
});

// Strict limiter for auth endpoints (login, register, password reset)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: { success: false, statusCode: 429, message: "Too many authentication attempts. Try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
    // Only count FAILED attempts against the limit — successful logins should never
    // trigger a lockout. Without this, 5 successful logins would block the 6th.
    skipSuccessfulRequests: true,
});

// Limiter for mutating operations (create/update/delete) — 60 per 15 min
export const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    message: { success: false, statusCode: 429, message: "Too many write operations. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limiter for export/report endpoints — heavy CPU/DB operations
export const exportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, statusCode: 429, message: "Too many export requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
});

// Limiter for backup read endpoints (status, settings, history)
// Higher limit because the backup page polls these endpoints automatically.
export const backupReadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, statusCode: 429, message: "Too many backup status requests. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,  // don't count successful reads against the limit
});

// Strict limiter for backup trigger — running a backup is expensive
export const backupTriggerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, statusCode: 429, message: "Too many backup trigger requests. Please wait before triggering another backup." },
    standardHeaders: true,
    legacyHeaders: false,
});
