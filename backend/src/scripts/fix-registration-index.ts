/**
 * One-time migration: fix-registration-index.ts
 *
 * Drops the old GLOBAL unique index on vehicles.registrationNo so that
 * Mongoose can recreate it as a PARTIAL unique index (isActive: true only).
 *
 * This allows re-registering a vehicle with the same registration number
 * after a soft-delete (isActive = false).
 *
 * Run once:
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-registration-index.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not set in environment");

    await mongoose.connect(uri);
    console.log("✅ Connected to MongoDB");

    const collection = mongoose.connection.db!.collection("vehicles");

    // List existing indexes
    const indexes = await collection.indexes();
    console.log("\nExisting indexes on vehicles collection:");
    indexes.forEach((idx) => console.log(" -", JSON.stringify(idx)));

    // Drop old global unique index if it exists (idempotent — safe to run multiple times)
    const oldIndexNames = ["registrationNo_1", "registrationNo_1_unique"];
    for (const name of oldIndexNames) {
        const exists = indexes.some((idx) => idx.name === name);
        if (exists) {
            try {
                await collection.dropIndex(name);
                console.log(`\n✅ Dropped old global unique index: ${name}`);
            } catch (e: any) {
                if (e?.code === 27) console.log(`\nℹ️  Index "${name}" already gone — skipping`);
                else throw e;
            }
        } else {
            console.log(`\nℹ️  Index "${name}" not found — skipping`);
        }
    }

    // Also check by key shape (some drivers name it differently), skip if already removed
    const globalRegIdx = indexes.find(
        (idx) =>
            idx.key?.registrationNo === 1 &&
            idx.unique === true &&
            !idx.partialFilterExpression
    );
    if (globalRegIdx) {
        try {
            await collection.dropIndex(globalRegIdx.name as string);
            console.log(`✅ Dropped global unique index: ${globalRegIdx.name}`);
        } catch (e: any) {
            if (e?.code === 27) console.log(`ℹ️  Index already gone — skipping`);
            else throw e;
        }
    }

    // Now let Mongoose recreate the partial unique index by connecting with the model
    const { Vehicle } = await import("../models/vehicle.model");
    await Vehicle.syncIndexes();
    console.log("\n✅ Synced indexes — partial unique index is now active");

    const newIndexes = await collection.indexes();
    console.log("\nIndexes after migration:");
    newIndexes.forEach((idx) => console.log(" -", JSON.stringify(idx)));

    await mongoose.disconnect();
    console.log("\n✅ Done. You can now re-add vehicles with previously deleted registration numbers.");
}

main().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
