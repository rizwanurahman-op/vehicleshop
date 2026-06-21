import { CorsOptions } from "cors";
import { env } from "./env";

/**
 * CORS configuration.
 *
 * Supports comma-separated origins in CORS_ORIGIN env var so you can
 * allow both staging and production frontends without code changes:
 *   CORS_ORIGIN=https://app.example.com,https://staging.example.com
 *
 * An empty or missing CORS_ORIGIN blocks all origins (safe default).
 */
const rawOrigins = (env.CORS_ORIGIN ?? "")
    .split(",")
    .map(o => o.trim())
    .filter(Boolean);

const allowedOrigins = new Set(rawOrigins);

export const corsOptions: CorsOptions = {
    origin: (requestOrigin, callback) => {
        // Allow same-origin requests (no Origin header — e.g., server-to-server, Postman)
        if (!requestOrigin) return callback(null, true);
        if (allowedOrigins.has(requestOrigin)) return callback(null, true);
        callback(new Error(`CORS: Origin '${requestOrigin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};
