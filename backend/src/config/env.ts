import { z } from "zod";

// Set default timezone to Indian Standard Time if not configured
process.env.TZ = process.env.TZ || "Asia/Kolkata";

const envSchema = z.object({
    PORT: z.string().default("5000"),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    // JWT secrets must be at least 32 chars to be cryptographically strong
    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
    JWT_ACCESS_EXPIRY: z.string().default("15m"),
    JWT_REFRESH_EXPIRY: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000").transform(val => val.replace(/\/+$/, "")),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    // Email / SMTP
    EMAIL_HOST: z.string().default("smtp.gmail.com"),
    EMAIL_PORT: z.string().default("587").transform(Number),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("VehicleBook <noreply@vehiclebook.com>"),
    // Frontend URL for reset links
    CLIENT_URL: z.string().default("http://localhost:3000").transform(val => val.replace(/\/+$/, "")),
    // ─── Telegram Backup (free, no quota issues) ─────────────────
    // Get BOT_TOKEN from @BotFather, CHAT_ID from getUpdates API
    TELEGRAM_BOT_TOKEN: z.string().optional(),
    TELEGRAM_CHAT_ID: z.string().optional(),
    // ─── Backup Security ──────────────────────────────────────────
    // Password for ZIP files — anyone who downloads from Telegram needs this to open
    // Generate a strong one: openssl rand -base64 24
    BACKUP_ZIP_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // Never log actual env values — only field names that failed
    console.error("❌ Invalid environment variables:", JSON.stringify(parsed.error.flatten().fieldErrors));
    process.exit(1);
}

export const env = parsed.data;
