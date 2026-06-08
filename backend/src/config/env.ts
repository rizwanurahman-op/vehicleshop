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
    // Email / SMTP
    EMAIL_HOST: z.string().default("smtp.gmail.com"),
    EMAIL_PORT: z.string().default("587").transform(Number),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASS: z.string().optional(),
    EMAIL_FROM: z.string().default("VehicleBook <noreply@vehiclebook.com>"),
    // Frontend URL for reset links
    CLIENT_URL: z.string().default("http://localhost:3000").transform(val => val.replace(/\/+$/, "")),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;
