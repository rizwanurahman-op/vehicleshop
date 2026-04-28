// ─── DNS Override (must be first, before any network imports) ─────────────────
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";

// ─── Admin credentials (change password after first login!) ───────────────────
const ADMIN = {
    username: "admin",
    email: "admin@vehiclebook.in",
    password: "Admin@123",
    role: "admin" as const,
};

// ─── Seed ─────────────────────────────────────────────────────────────────────
const seed = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclebook";

    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { dbName: "vehiclebook" });
    console.log("✅ Connected!\n");

    // Idempotent — skip if admin already exists
    const existing = await User.findOne({ username: ADMIN.username });
    if (existing) {
        console.log("⚠️  Admin user already exists. No changes made.");
        console.log("");
        console.log("   🔐 Use these credentials to login:");
        console.log("   ┌──────────────────────────────────────┐");
        console.log("   │  Username : admin                    │");
        console.log("   │  Email    : admin@vehiclebook.in     │");
        console.log("   │  Password : (as set during seed)     │");
        console.log("   └──────────────────────────────────────┘");
        await mongoose.disconnect();
        process.exit(0);
    }

    const passwordHash = await bcrypt.hash(ADMIN.password, 12);

    await User.create({
        username: ADMIN.username,
        email: ADMIN.email,
        passwordHash,
        role: ADMIN.role,
    });

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("   🔐 Login Credentials:");
    console.log("   ┌──────────────────────────────────────┐");
    console.log("   │  Username : admin                    │");
    console.log("   │  Email    : admin@vehiclebook.in     │");
    console.log(`   │  Password : ${ADMIN.password.padEnd(24)}│`);
    console.log("   └──────────────────────────────────────┘");
    console.log("");
    console.log("   ⚠️  Please change your password after first login!");
    console.log("");

    await mongoose.disconnect();
    console.log("✅ Seed complete.");
    process.exit(0);
};

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
