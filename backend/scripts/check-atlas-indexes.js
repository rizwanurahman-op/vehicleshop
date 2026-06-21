/**
 * check-atlas-indexes.js
 * Verifies all model index fixes are live in MongoDB Atlas (vehiclebook).
 * Run with: node scripts/check-atlas-indexes.js
 */

const { MongoClient } = require("mongodb");

const ATLAS_URI =
    "mongodb+srv://rizwanurahmanop_db_user_friends:lIQQplH5OOFnJCUM@cluster0.myx6kio.mongodb.net/vehiclebook?retryWrites=true&w=majority&appName=Cluster0";

// ── Expected indexes per collection ──────────────────────────────────────────
const EXPECTED = {
    vehicles: [
        { key: "_id:1" },
        { key: "vehicleId:1",                    note: "unique — fixed: removed duplicate index:true" },
        { key: "vehicleType:1" },
        { key: "status:1",                       note: "standalone — fixed: moved from field-level" },
        { key: "saleStatus:1" },
        { key: "datePurchased:-1" },
        { key: "createdAt:-1" },
        { key: "dateSold:-1" },
        { key: "vehicleType:1,status:1" },
        { key: "fundingSource:1" },
        { key: "nocStatus:1" },
        { key: "registrationNo:1",               note: "unique partial (isActive:true)" },
        { key: "totalInvestment:-1",             note: "NEW analytics index" },
        { key: "profitLoss:-1",                  note: "NEW analytics index" },
        { key: "isActive:1,status:1,dateSold:-1",note: "NEW compound index" },
        { isText: true,                          note: "text search" },
    ],
    consignmentvehicles: [
        { key: "_id:1" },
        { key: "consignmentId:1",               note: "unique — fixed: removed duplicate index:true" },
        { key: "saleType:1" },
        { key: "status:1",                      note: "fixed: removed duplicate field-level index:true" },
        { key: "vehicleType:1" },
        { key: "nocStatus:1" },
        { key: "settlementStatus:1" },
        { key: "dateReceived:-1" },
        { key: "dateSold:-1" },
        { key: "buyerPaymentStatus:1" },
        { key: "payeePaymentStatus:1" },
        { key: "saleType:1,status:1" },
        { key: "totalInvestment:-1",             note: "NEW analytics index" },
        { key: "netProfit:-1",                   note: "NEW analytics index" },
        { key: "isActive:1,status:1,dateSold:-1",note: "NEW compound index" },
        { isText: true,                          note: "text search" },
    ],
    users: [
        { key: "_id:1" },
        { key: "username:1",                    note: "unique" },
        { key: "email:1",                       note: "unique" },
        { key: "passwordResetToken:1",          note: "NEW — sparse reset token lookup" },
    ],
    lenders: [
        { key: "_id:1" },
        { key: "lenderId:1",                    note: "unique" },
        { key: "name:1" },
        { key: "isActive:1",                    note: "fixed: removed duplicate field-level index:true" },
    ],
    vehicleowners: [
        { key: "_id:1" },
        { key: "ownerId:1",                     note: "unique — fixed: removed redundant index:true" },
        { key: "name:1" },
        { key: "phone:1" },
    ],
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function keyString(keyDoc) {
    return Object.entries(keyDoc).map(([k, v]) => `${k}:${v}`).join(",");
}

function findDuplicates(actualIndexes) {
    const seen = {};
    const dupes = [];
    for (const idx of actualIndexes) {
        const ks = keyString(idx.key);
        if (seen[ks]) dupes.push(ks);
        seen[ks] = true;
    }
    return dupes;
}

async function run() {
    const client = new MongoClient(ATLAS_URI);
    try {
        await client.connect();
        console.log("\n🔗 Connected to MongoDB Atlas (vehiclebook)\n");
        const db = client.db("vehiclebook");

        let overallOk = true;

        for (const [collName, expectedList] of Object.entries(EXPECTED)) {
            const coll = db.collection(collName);
            let actualIndexes;
            try {
                actualIndexes = await coll.indexes();
            } catch {
                console.log(`\n⚠️  Collection [${collName}] not found (no documents inserted yet)`);
                continue;
            }

            const dupes = findDuplicates(actualIndexes);
            const rows = [];
            let allOk = true;

            for (const exp of expectedList) {
                if (exp.isText) {
                    const found = actualIndexes.some(i => Object.values(i.key).includes("text"));
                    if (!found) { allOk = false; overallOk = false; }
                    rows.push({ status: found ? "✅" : "❌ MISSING", key: "(text index)", note: exp.note });
                    continue;
                }
                const found = actualIndexes.some(i => keyString(i.key) === exp.key);
                if (!found) { allOk = false; overallOk = false; }
                rows.push({ status: found ? "✅" : "❌ MISSING", key: exp.key, note: exp.note || "" });
            }

            console.log(`\n${"─".repeat(72)}`);
            console.log(`📦  ${collName.toUpperCase()}  (${actualIndexes.length} indexes in Atlas)`);
            console.log(`${"─".repeat(72)}`);
            console.log(`${"St".padEnd(4)} ${"Index Key".padEnd(42)} Note`);
            console.log(`${"─".repeat(72)}`);
            for (const r of rows) {
                console.log(`${r.status.padEnd(4)} ${r.key.padEnd(42)} ${r.note}`);
            }

            if (dupes.length > 0) {
                console.log(`\n  ⚠️  DUPLICATE indexes in Atlas: ${dupes.join(", ")}`);
                overallOk = false;
            }

            console.log(allOk && dupes.length === 0
                ? `\n  ✅ ALL INDEXES OK — no duplicates`
                : `\n  ❌ ISSUES FOUND — see above`);

            // All actual Atlas indexes for reference
            console.log(`\n  Raw Atlas indexes:`);
            for (const idx of actualIndexes) {
                const flags = [
                    idx.unique ? "UNIQUE" : "",
                    idx.sparse ? "sparse" : "",
                    idx.partialFilterExpression ? `partial:${JSON.stringify(idx.partialFilterExpression)}` : "",
                ].filter(Boolean).join(", ");
                console.log(`    ${idx.name.padEnd(52)} ${keyString(idx.key)}  ${flags ? `[${flags}]` : ""}`);
            }
        }

        // ── Field check: refreshTokenFamily ──────────────────────────────────
        console.log(`\n${"─".repeat(72)}`);
        console.log(`🔍  Field check: users.refreshTokenFamily`);
        console.log(`${"─".repeat(72)}`);
        const users = await db.collection("users")
            .find({}, { projection: { username: 1, role: 1, refreshTokenFamily: 1 } })
            .toArray();
        for (const u of users) {
            const has = "refreshTokenFamily" in u;
            const val = has ? (u.refreshTokenFamily ?? "null (no active session)") : "MISSING";
            console.log(`  ${has ? "✅" : "❌"} ${u.username} (${u.role}) → refreshTokenFamily: ${val}`);
            if (!has) overallOk = false;
        }

        // ── Document counts ───────────────────────────────────────────────────
        console.log(`\n${"─".repeat(72)}`);
        console.log(`📊  Document counts`);
        console.log(`${"─".repeat(72)}`);
        for (const collName of Object.keys(EXPECTED)) {
            const count = await db.collection(collName).countDocuments().catch(() => "N/A");
            console.log(`  ${collName.padEnd(25)} ${count} documents`);
        }

        console.log(`\n${"═".repeat(72)}`);
        console.log(overallOk
            ? `🎉 ALL CHECKS PASSED — Atlas DB matches all model definitions`
            : `❌ SOME CHECKS FAILED — review details above`);
        console.log(`${"═".repeat(72)}\n`);

    } catch (err) {
        console.error("❌ Atlas connection error:", err.message);
    } finally {
        await client.close();
    }
}

run();
