import "dotenv/config";
import mongoose from "mongoose";

const listDbStats = async () => {
    const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehiclebook";
    console.log("🔑 Connecting to MongoDB with URI:", MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected!\n");

    const admin = mongoose.connection.db!.admin();
    const dbsList = await admin.listDatabases();
    console.log("📂 Available Databases:");
    console.log(dbsList.databases.map(db => `  • ${db.name} (${db.sizeOnDisk != null ? `${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB` : "unknown size"})`).join("\n"));

    console.log("\n📊 Collection counts in current database (" + mongoose.connection.name + "):");
    const collections = await mongoose.connection.db!.listCollections().toArray();
    for (const col of collections) {
        const count = await mongoose.connection.db!.collection(col.name).countDocuments();
        console.log(`  • ${col.name}: ${count} documents`);
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected.");
};

listDbStats().catch(err => {
    console.error("❌ Failed to query database stats:", err);
    process.exit(1);
});
