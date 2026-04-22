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

const app = express();

// ─── Security Middleware ───────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(mongoSanitize());

// ─── Request Parsing ───────────────────────────────────────────
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
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
app.use("/api/v1/lenders", lenderRoutes);
app.use("/api/v1/investments", investmentRoutes);
app.use("/api/v1/repayments", repaymentRoutes);
app.use("/api/v1/summary", summaryRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/consignments", consignmentRoutes);
app.use("/api/v1/vehicle-owners", vehicleOwnerRoutes);
app.use("/api/v1/exchanges", exchangeRoutes);
app.use("/api/v1/sales", salesRoutes);

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
