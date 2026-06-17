/**
 * migrate-indexes.ts
 *
 * Safe, idempotent migration script to synchronize MongoDB indexes
 * with the current Mongoose schema definitions.
 *
 * WHY THIS IS NEEDED:
 * When you change a schema's index definition (e.g. adding partialFilterExpression,
 * changing unique constraints, adding/removing fields), MongoDB does NOT
 * automatically update existing indexes in a live database.
 * The old index stays in place — causing conflicts or missing behaviour.
 *
 * This script MUST be run manually on the production database whenever
 * schema indexes have changed between deployments.
 *
 * HOW TO RUN (on production, via Render shell or locally with prod MONGODB_URI):
 *   MONGODB_URI=<prod_uri> npx ts-node -r tsconfig-paths/register src/scripts/migrate-indexes.ts
 *
 * It is safe to re-run. All operations are idempotent.
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function dropIndexIfExists(
    collection: mongoose.mongo.Collection,
    nameOrKey: string | Record<string, unknown>
): Promise<void> {
    const indexes = await collection.indexes();

    let targetName: string | undefined;

    if (typeof nameOrKey === "string") {
        // Match by name
        const found = indexes.find((idx) => idx.name === nameOrKey);
        targetName = found?.name;
    } else {
        // Match by key shape
        const found = indexes.find((idx) => {
            const idxKeyStr = JSON.stringify(idx.key);
            const targetKeyStr = JSON.stringify(nameOrKey);
            return idxKeyStr === targetKeyStr;
        });
        targetName = found?.name;
    }

    if (!targetName) {
        console.log(`  ℹ️  Index not found — skipping: ${JSON.stringify(nameOrKey)}`);
        return;
    }

    try {
        await collection.dropIndex(targetName);
        console.log(`  ✅ Dropped index: ${targetName}`);
    } catch (e: any) {
        if (e?.code === 27) {
            console.log(`  ℹ️  Index "${targetName}" already gone — skipping`);
        } else {
            throw e;
        }
    }
}

// ─── Migration steps ──────────────────────────────────────────────────────────

async function migrateVehicleIndexes(db: mongoose.mongo.Db) {
    console.log("\n📦 Migrating: vehicles collection");
    const collection = db.collection("vehicles");

    const existing = await collection.indexes();
    console.log("  Current indexes:", existing.map((i) => i.name).join(", "));

    // Drop all stale global unique registrationNo indexes (various historical names)
    const staleNames = ["registrationNo_1", "registrationNo_1_unique"];
    for (const name of staleNames) {
        await dropIndexIfExists(collection, name);
    }

    // Drop any global unique index matched by key shape (no partialFilterExpression)
    const globalUnique = existing.find(
        (idx) =>
            idx.key?.registrationNo === 1 &&
            idx.unique === true &&
            !idx.partialFilterExpression
    );
    if (globalUnique) {
        await dropIndexIfExists(collection, globalUnique.name!);
    }

    // Let Mongoose recreate correct indexes from the current schema definition
    const { Vehicle } = await import("../models/vehicle.model");
    await Vehicle.syncIndexes();
    console.log("  ✅ vehicles indexes synced");
}

async function migrateConsignmentIndexes(db: mongoose.mongo.Db) {
    console.log("\n📦 Migrating: consignmentvehicles collection");
    const collection = db.collection("consignmentvehicles");

    const existing = await collection.indexes();
    console.log("  Current indexes:", existing.map((i) => i.name).join(", "));

    // Drop any stale global unique registrationNo indexes
    const staleNames = ["registrationNo_1", "registrationNo_1_unique"];
    for (const name of staleNames) {
        await dropIndexIfExists(collection, name);
    }

    const { ConsignmentVehicle } = await import("../models/consignment-vehicle.model");
    await ConsignmentVehicle.syncIndexes();
    console.log("  ✅ consignmentvehicles indexes synced");
}

async function migrateCounterIndexes(_db: mongoose.mongo.Db) {
    console.log("\n📦 Migrating: counters collection");
    const { Counter } = await import("../models/counter.model");
    await Counter.syncIndexes();
    console.log("  ✅ counters indexes synced");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI not set in environment");

    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("✅ Connected");

    const db = mongoose.connection.db!;

    await migrateVehicleIndexes(db);
    await migrateConsignmentIndexes(db);
    await migrateCounterIndexes(db);

    // Print final state
    console.log("\n📋 Final index state:");
    for (const colName of ["vehicles", "consignmentvehicles", "counters"]) {
        const col = db.collection(colName);
        const idxs = await col.indexes();
        console.log(`\n  ${colName}:`);
        idxs.forEach((i) => console.log(`    - ${i.name}  unique=${i.unique ?? false}  partial=${!!i.partialFilterExpression}`));
    }

    await mongoose.disconnect();
    console.log("\n✅ Migration complete. Indexes are up to date.");
}

main().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});
