/**
 * migrate-refresh-token-family.js
 *
 * One-time migration: adds the `refreshTokenFamily` field (set to null)
 * to any existing user documents in MongoDB Atlas that are missing it.
 *
 * Run with: node scripts/migrate-refresh-token-family.js
 */

const { MongoClient } = require("mongodb");

const ATLAS_URI =
    "mongodb+srv://rizwanurahmanop_db_user_friends:lIQQplH5OOFnJCUM@cluster0.myx6kio.mongodb.net/vehiclebook?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
    const client = new MongoClient(ATLAS_URI);
    try {
        await client.connect();
        console.log("\n🔗 Connected to MongoDB Atlas (vehiclebook)\n");

        const db = client.db("vehiclebook");
        const users = db.collection("users");

        // Count how many users are missing the field
        const missing = await users.countDocuments({ refreshTokenFamily: { $exists: false } });
        console.log(`📋 Found ${missing} user(s) missing the [refreshTokenFamily] field.`);

        if (missing === 0) {
            console.log("✅ All users already have the [refreshTokenFamily] field. Nothing to do.\n");
            return;
        }

        // Backfill: add refreshTokenFamily: null to all docs that don't have it
        const result = await users.updateMany(
            { refreshTokenFamily: { $exists: false } },
            { $set: { refreshTokenFamily: null } }
        );

        console.log(`✅ Migration complete!`);
        console.log(`   Matched : ${result.matchedCount} documents`);
        console.log(`   Modified: ${result.modifiedCount} documents`);

        // Verify
        const stillMissing = await users.countDocuments({ refreshTokenFamily: { $exists: false } });
        if (stillMissing === 0) {
            console.log(`\n🎉 All user documents now have [refreshTokenFamily] field.\n`);
        } else {
            console.log(`\n⚠️  ${stillMissing} document(s) still missing the field — check manually.\n`);
        }

        // Show current users
        console.log("📄 Current users in Atlas:");
        const allUsers = await users
            .find({}, { projection: { username: 1, email: 1, role: 1, refreshTokenFamily: 1 } })
            .toArray();

        for (const u of allUsers) {
            const family = u.refreshTokenFamily === null ? "null (no active session)" : u.refreshTokenFamily;
            console.log(`  → ${u.username} (${u.role}) | refreshTokenFamily: ${family}`);
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        await client.close();
    }
}

run();
