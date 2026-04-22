import mongoose from "mongoose";
import { env } from "./env";

let retries = 0;
const MAX_RETRIES = 5;

export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(env.MONGODB_URI, {
            dbName: "vehiclebook",
        });
        console.log("✅ MongoDB connected successfully");
        retries = 0;
    } catch (error) {
        retries++;
        console.error(`❌ MongoDB connection failed (attempt ${retries}/${MAX_RETRIES}):`, error);
        if (retries < MAX_RETRIES) {
            console.log(`⏳ Retrying in 5 seconds...`);
            setTimeout(connectDB, 5000);
        } else {
            console.error("❌ Max retries reached. Exiting.");
            process.exit(1);
        }
    }
};

mongoose.connection.on("disconnected", () => {
    console.warn("⚠️ MongoDB disconnected. Attempting reconnect...");
    setTimeout(connectDB, 5000);
});
