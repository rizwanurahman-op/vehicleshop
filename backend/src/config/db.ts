import mongoose from "mongoose";
import dns from "dns";
import { env } from "./env";

// ─── DNS Override ─────────────────────────────────────────────────────────────
// Some ISPs block MongoDB Atlas SRV record resolution (_mongodb._tcp.*).
// Explicitly using Cloudflare (1.1.1.1) and Google (8.8.8.8) DNS ensures SRV
// lookups succeed in all environments — local, staging, and production.
// Cloud providers (Railway, Render, EC2, etc.) have their own DNS and are
// unaffected; this is purely a Node-level DNS resolver override.
dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);

// ─── Config ───────────────────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

// ─── State ────────────────────────────────────────────────────────────────────
// Shared promise: prevents parallel retry loops if connectDB() is called
// multiple times simultaneously (e.g. from the 'disconnected' event handler).
let connectionPromise: Promise<void> | null = null;

// Mongoose fires 'disconnected' at startup before any connect() is called.
// This flag ensures the reconnect handler is a no-op until a real connection
// has been established at least once.
let hasConnectedOnce = false;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── Core Attempt ─────────────────────────────────────────────────────────────
const attemptConnect = async (): Promise<void> => {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            await mongoose.connect(env.MONGODB_URI, {
                dbName: "vehiclebook",
                // Recommended production timeouts
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
            });
            console.log("✅ MongoDB connected successfully");
            hasConnectedOnce = true;
            return;
        } catch (error) {
            console.error(`❌ MongoDB connection failed (attempt ${attempt}/${MAX_RETRIES}):`, error);
            if (attempt < MAX_RETRIES) {
                console.log(`⏳ Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
                await sleep(RETRY_DELAY_MS);
            } else {
                console.error("❌ Max retries reached. Exiting.");
                process.exit(1);
            }
        }
    }
};

// ─── Public API ───────────────────────────────────────────────────────────────
export const connectDB = async (): Promise<void> => {
    // Reuse in-flight promise if a connection attempt is already running
    if (connectionPromise) return connectionPromise;

    connectionPromise = attemptConnect().finally(() => {
        connectionPromise = null;
    });

    return connectionPromise;
};

// ─── Reconnect on Drop ────────────────────────────────────────────────────────
mongoose.connection.on("disconnected", () => {
    // Ignore the startup 'disconnected' event fired before any connect() call
    if (!hasConnectedOnce) return;
    console.warn("⚠️ MongoDB disconnected. Attempting reconnect...");
    connectDB().catch(err => console.error("❌ Reconnect failed:", err));
});

mongoose.connection.on("error", (err) => {
    console.error("❌ MongoDB connection error:", err);
});

