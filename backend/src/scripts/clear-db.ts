import mongoose from "mongoose";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const clearDb = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclebook";

    console.log("🔥 Connecting to MongoDB to clear database...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!");

    console.log("⚠️ Fetching collections...");
    const db = mongoose.connection.db;
    if (!db) {
        throw new Error("Could not get db object from mongoose connection");
    }

    const collections = await db.collections();
    console.log(`Found ${collections.length} collections.`);
    
    for (const collection of collections) {
        if (collection.collectionName === "users") {
            console.log(`   ⏭️ Skipping drop of collection: ${collection.collectionName}`);
            continue;
        }
        console.log(`   Attempting to drop collection: ${collection.collectionName}`);
        try {
            await collection.drop();
            console.log(`   ✅ Dropped ${collection.collectionName}`);
        } catch (error: any) {
            console.error(`   ❌ Failed to drop ${collection.collectionName}:`, error.message);
        }
    }
    console.log("✅ All collections processed!");

    console.log("Disconnecting...");
    await mongoose.disconnect();
    console.log("✅ Disconnected!");
};

clearDb().catch((err) => {
    console.error("❌ Error clearing database:", err);
    process.exit(1);
});
