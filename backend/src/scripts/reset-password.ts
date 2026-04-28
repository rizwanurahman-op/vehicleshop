// ─── DNS Override (must be first, before any network imports) ─────────────────
import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8", "8.8.4.4"]);

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model";

// ─── New password to set ───────────────────────────────────────────────────────
const NEW_PASSWORD = "Admin@123";
const ADMIN_USERNAME = "admin";

const resetPassword = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclebook";

    console.log("🔑 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { dbName: "vehiclebook" });
    console.log("✅ Connected!\n");

    const user = await User.findOne({ username: ADMIN_USERNAME });
    if (!user) {
        console.error(`❌ No user found with username "${ADMIN_USERNAME}". Run seed first.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 12);
    user.passwordHash = passwordHash;
    user.refreshToken = null; // invalidate all existing sessions
    await user.save();

    console.log("✅ Admin password reset successfully!");
    console.log("");
    console.log("   🔐 New Login Credentials:");
    console.log("   ┌──────────────────────────────────────┐");
    console.log("   │  Username : admin                    │");
    console.log("   │  Email    : admin@vehiclebook.in     │");
    console.log(`   │  Password : ${NEW_PASSWORD.padEnd(24)}│`);
    console.log("   └──────────────────────────────────────┘");
    console.log("");
    console.log("   ⚠️  Please change your password after login!");

    await mongoose.disconnect();
    console.log("✅ Done.");
    process.exit(0);
};

resetPassword().catch(err => {
    console.error("❌ Reset failed:", err);
    process.exit(1);
});
