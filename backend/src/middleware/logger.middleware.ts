import morgan, { StreamOptions } from "morgan";
import { env } from "../config/env";

const stream: StreamOptions = {
    write: (message: string) => console.log(message.trim()),
};

/**
 * Sanitize query params that could contain sensitive values from a URL string.
 * Replaces the value of known sensitive keys (token, key, secret, password, etc.)
 * with [REDACTED] so they are never written to logs.
 * Currently no route passes tokens via query params — this is defensive-in-depth.
 */
const SENSITIVE_PARAMS = /(\b(?:token|key|secret|password|passwd|pwd|auth|api_key)\b)=[^&]*/gi;

const sanitizeUrl = (url: string): string =>
    url.replace(SENSITIVE_PARAMS, "$1=[REDACTED]");

// Custom format: same as morgan's "combined" / "dev" but with URL sanitization applied.
// Cast req to include Express-specific originalUrl (morgan types it as IncomingMessage).
morgan.token("sanitized-url", (req) => {
    const r = req as { originalUrl?: string; url?: string };
    return sanitizeUrl(r.originalUrl || r.url || "");
});

const devFormat    = ":method :sanitized-url :status :response-time ms";
const combinedFormat = ":remote-addr - :remote-user [:date[clf]] \":method :sanitized-url HTTP/:http-version\" :status :res[content-length] \":referrer\" \":user-agent\"";

export const requestLogger = morgan(
    env.NODE_ENV === "production" ? combinedFormat : devFormat,
    { stream }
);

