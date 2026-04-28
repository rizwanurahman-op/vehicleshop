import { z } from "zod";

const envSchema = z.object({
    PORT: z.string().default("5000"),
    MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
    JWT_ACCESS_SECRET: z.string().min(1, "JWT_ACCESS_SECRET is required"),
    JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
    JWT_ACCESS_EXPIRY: z.string().default("15m"),
    JWT_REFRESH_EXPIRY: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:3000").transform(val => val.replace(/\/+$/, "")),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
