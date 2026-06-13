import "express-async-errors";
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";

import { env } from "./config/env";
import { connectDB } from "./config/db";
import { corsOptions } from "./config/cors";
import { requestLogger } from "./middleware/logger.middleware";
import { generalLimiter } from "./middleware/rate-limit.middleware";
import { errorHandler } from "./middleware/error.middleware";
import { initializeCounters } from "./services/counter.service";

import authRoutes from "./routes/auth.routes";
import lenderRoutes from "./routes/lender.routes";
import investmentRoutes from "./routes/investment.routes";
import repaymentRoutes from "./routes/repayment.routes";
import summaryRoutes from "./routes/summary.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import consignmentRoutes from "./routes/consignment.routes";
import vehicleOwnerRoutes from "./routes/vehicle-owner.routes";
import exchangeRoutes from "./routes/exchange.routes";
import salesRoutes from "./routes/sales.routes";
import userRoutes from "./routes/user.routes";
import backupRoutes from "./routes/backup.routes";

const app = express();

// ─── Proxy Trust ───────────────────────────────────────────────
// Required on hosted platforms (Render, Heroku, etc.) that sit behind a
// reverse proxy. Allows express-rate-limit to read the real client IP
// from the X-Forwarded-For header without throwing ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
app.set("trust proxy", 1);

// ─── Security Middleware ───────────────────────────────────────
// Disable "X-Powered-By: Express" to reduce server fingerprinting
app.disable("x-powered-by");

app.use(
    helmet({
        // Content Security Policy
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'"],
                frameAncestors: ["'none'"],
                formAction: ["'self'"],
                baseUri: ["'self'"],
            },
        },
        // HTTP Strict Transport Security — only in production
        hsts: env.NODE_ENV === "production"
            ? { maxAge: 63072000, includeSubDomains: true, preload: true }
            : false,
        // Block MIME type sniffing
        noSniff: true,
        // Prevent framing (clickjacking)
        frameguard: { action: "deny" },
        // Enable XSS filter in legacy browsers
        xssFilter: true,
        // Remove referrer information on cross-origin navigation
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
);
app.use(cors(corsOptions));
app.use(mongoSanitize());

// ─── Request Parsing ───────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────
app.use(requestLogger);

// ─── Rate Limiting ─────────────────────────────────────────────
app.use("/api", generalLimiter);

// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, message: "VehicleBook API is running 🚗", timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/lenders", lenderRoutes);
app.use("/api/v1/investments", investmentRoutes);
app.use("/api/v1/repayments", repaymentRoutes);
app.use("/api/v1/summary", summaryRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/consignments", consignmentRoutes);
app.use("/api/v1/vehicle-owners", vehicleOwnerRoutes);
app.use("/api/v1/exchanges", exchangeRoutes);
app.use("/api/v1/sales", salesRoutes);
app.use("/api/v1/backups", backupRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use("*", (_req, res) => {
    res.status(404).json({ success: false, statusCode: 404, message: "Route not found" });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
const startServer = async () => {
    await connectDB();
    await initializeCounters();

    // Initialize scheduled backup jobs (reads settings from DB)
    const { initializeBackupScheduler } = await import("./services/backup-scheduler.service");
    await initializeBackupScheduler();

    const PORT = parseInt(env.PORT, 10);
    app.listen(PORT, () => {
        console.log(`🚀 VehicleBook API running on http://localhost:${PORT}`);
        console.log(`📡 API Base: http://localhost:${PORT}/api/v1`);
        console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });
};

startServer().catch(err => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
});

export default app;
