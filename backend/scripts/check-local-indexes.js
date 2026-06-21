/**
 * check-local-indexes.js
 * Verifies all model index changes are live in the LOCAL MongoDB (localhost:27017/vehiclebook).
 * Run with: node scripts/check-local-indexes.js
 */

const { MongoClient } = require("mongodb");

const LOCAL_URI = "mongodb://localhost:27017/vehiclebook";

// ── Expected indexes per collection ──────────────────────────────────────────
const EXPECTED = {
    vehicles: [
        { key: "_id:1" },
        { key: "vehicleId:1",          unique: true,  note: "unique — no duplicate index:true" },
        { key: "vehicleType:1" },
        { key: "status:1",             note: "standalone (moved from field-level index:true)" },
        { key: "saleStatus:1" },
        { key: "datePurchased:-1" },
        { key: "createdAt:-1" },
        { key: "dateSold:-1" },
        { key: "vehicleType:1,status:1" },
        { key: "fundingSource:1" },
        { key: "nocStatus:1" },
        { key: "registrationNo:1",     unique: true,  note: "partial unique (isActive:true)" },
        { key: "totalInvestment:-1",   note: "NEW — report analytics" },
        { key: "profitLoss:-1",        note: "NEW — report analytics" },
        { key: "isActive:1,status:1,dateSold:-1", note: "NEW — compound report filter" },
        { isText: true,                note: "text search index" },
    ],
    consignmentvehicles: [
        { key: "_id:1" },
        { key: "consignmentId:1",      unique: true,  note: "unique — no duplicate index:true" },
        { key: "saleType:1" },
        { key: "status:1" },
        { key: "vehicleType:1" },
        { key: "nocStatus:1" },
        { key: "settlementStatus:1" },
        { key: "dateReceived:-1" },
        { key: "dateSold:-1" },
        { key: "buyerPaymentStatus:1" },
        { key: "payeePaymentStatus:1" },
        { key: "saleType:1,status:1" },
        { key: "totalInvestment:-1",   note: "NEW — report analytics" },
        { key: "netProfit:-1",         note: "NEW — report analytics" },
        { key: "isActive:1,status:1,dateSold:-1", note: "NEW — compound report filter" },
        { isText: true,                note: "text search index" },
    ],
    users: [
        { key: "_id:1" },
        { key: "username:1",           unique: true },
        { key: "email:1",              unique: true },
        { key: "passwordResetToken:1", note: "sparse — password reset lookup" },
    ],
    lenders: [
        { key: "_id:1" },
        { key: "lenderId:1",           unique: true,  note: "unique" },
        { key: "name:1" },
        { key: "isActive:1",           note: "fixed — was duplicated with field-level index:true" },
    ],
    vehicleowners: [
        { key: "_id:1" },
        { key: "ownerId:1",            unique: true,  note: "unique — removed redundant index:true" },
        { key: "name:1" },
        { key: "phone:1" },
    ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function keyString(keyDoc) {
    return Object.entries(keyDoc)
        .map(([k, v]) => `${k}:${v}`)
        .join(",");
}

function checkCollection(collName, actualIndexes, expectedList) {
    let allOk = true;
    const rows = [];

    for (const exp of expectedList) {
        if (exp.isText) {
            const found = actualIndexes.some(i => Object.values(i.key).includes("text"));
            rows.push({
                status: found ? "✅" : "❌ MISSING",
                key: "(text index)",
                note: exp.note || "",
            });
            if (!found) allOk = false;
            continue;
        }

        const found = actualIndexes.some(i => keyString(i.key) === exp.key);
        rows.push({
            status: found ? "✅" : "❌ MISSING",
            key: exp.key,
            note: exp.note || (exp.unique ? "unique" : ""),
        });
        if (!found) allOk = false;
    }

    return { allOk, rows };
}

// Check for any unexpected DUPLICATE indexes (same key appearing twice)
function findDuplicates(actualIndexes) {
    const seen = {};
    const dupes = [];
    for (const idx of actualIndexes) {
        const ks = keyString(idx.key);
        if (seen[ks]) {
            dupes.push(ks);
        }
        seen[ks] = true;
    }
    return dupes;
}

async function run() {
    const client = new MongoClient(LOCAL_URI);
    try {
        await client.connect();
        console.log("\n🔗 Connected to LOCAL MongoDB (localhost:27017/vehiclebook)\n");
        const db = client.db("vehiclebook");

        let overallOk = true;

        for (const [collName, expectedList] of Object.entries(EXPECTED)) {
            const coll = db.collection(collName);
            let actualIndexes;
            try {
                actualIndexes = await coll.indexes();
            } catch {
                console.log(`\n⚠️  Collection [${collName}] does not exist yet (no documents inserted)`);
                continue;
            }

            const { allOk, rows } = checkCollection(collName, actualIndexes, expectedList);
            const dupes = findDuplicates(actualIndexes);

            console.log(`\n${"─".repeat(70)}`);
            console.log(`📦 ${collName}  (${actualIndexes.length} indexes in DB)`);
            console.log(`${"─".repeat(70)}`);
            console.log(`${"St".padEnd(5)} ${"Index Key".padEnd(40)} Note`);
            console.log(`${"─".repeat(70)}`);
            for (const row of rows) {
                console.log(`${row.status.padEnd(5)} ${row.key.padEnd(40)} ${row.note}`);
                if (row.status.includes("MISSING")) overallOk = false;
            }

            if (dupes.length > 0) {
                console.log(`\n  ⚠️  DUPLICATE INDEXES FOUND: ${dupes.join(", ")}`);
                overallOk = false;
            } else {
                console.log(`\n  ✅ No duplicate indexes`);
            }

            // Show full index list from DB
            console.log(`\n  All indexes currently in DB:`);
            for (const idx of actualIndexes) {
                const flags = [
                    idx.unique ? "unique" : "",
                    idx.sparse ? "sparse" : "",
                    idx.partialFilterExpression ? `partial:${JSON.stringify(idx.partialFilterExpression)}` : "",
                ].filter(Boolean).join(", ");
                console.log(`    ${("  " + idx.name).padEnd(55)} ${keyString(idx.key)}  ${flags ? `[${flags}]` : ""}`);
            }
        }

        // ── Field-level check: refreshTokenFamily in users ────────────────────
        console.log(`\n${"─".repeat(70)}`);
        console.log(`🔍 Schema field check: users.refreshTokenFamily`);
        console.log(`${"─".repeat(70)}`);
        const sample = await db.collection("users").findOne({}, {
            projection: { username: 1, refreshTokenFamily: 1 }
        });
        if (sample) {
            const hasField = "refreshTokenFamily" in sample;
            console.log(`  ${hasField ? "✅" : "❌"} refreshTokenFamily field: ${
                hasField ? `Present (value: ${JSON.stringify(sample.refreshTokenFamily)})` : "MISSING"
            }`);
        } else {
            console.log("  ⚠️  No user documents found");
        }

        // ── Summary ───────────────────────────────────────────────────────────
        console.log(`\n${"═".repeat(70)}`);
        if (overallOk) {
            console.log(`🎉 ALL CHECKS PASSED — DB indexes match model definitions`);
        } else {
            console.log(`❌ SOME CHECKS FAILED — see details above`);
        }
        console.log(`${"═".repeat(70)}\n`);

    } catch (err) {
        console.error("❌ Connection error:", err.message);
    } finally {
        await client.close();
    }
}

run();
