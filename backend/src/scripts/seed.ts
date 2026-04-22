import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";
import { initializeCounters } from "../services/counter.service";

const seed = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclebook";
    
    console.log("🌱 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!");

    await initializeCounters();

    // Check if admin already exists
    const existing = await User.findOne({ username: "admin" });
    if (existing) {
        console.log("⚠️  Admin user already exists! Credentials:");
        console.log("   Username : admin");
        console.log("   Email    : admin@vehiclebook.in");
        console.log("   Password : admin123");
        await mongoose.disconnect();
        return;
    }

    const passwordHash = await bcrypt.hash("admin123", 12);

    await User.create({
        username: "admin",
        email: "admin@vehiclebook.in",
        passwordHash,
        role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log("");
    console.log("   🔐 Login Credentials:");
    console.log("   ┌────────────────────────────────┐");
    console.log("   │  Username : admin              │");
    console.log("   │  Email    : admin@vehiclebook.in│");
    console.log("   │  Password : admin123           │");
    console.log("   └────────────────────────────────┘");
    console.log("");

    await mongoose.disconnect();
    console.log("✅ Done!");
    process.exit(0);
};

seed().catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
