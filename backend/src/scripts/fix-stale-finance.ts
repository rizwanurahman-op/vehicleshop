/**
 * fix-stale-finance.ts
 * One-shot migration: clear stale financeCompany / financeAmount on vehicles
 * that are currently in_stock (no sale) but still carry finance data from a
 * reverted sale.  Run once with:
 *   npx ts-node -r tsconfig-paths/register src/scripts/fix-stale-finance.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { Vehicle } from "../models/vehicle.model";

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log("Connected to MongoDB");

    // Find active vehicles that:
    //  - have no dateSold (not currently sold)
    //  - have a financeCompany set OR financeAmount > 0
    //  - have no Finance-mode salePayments (or salePayments is empty)
    const stale = await Vehicle.find({
        isActive: true,
        dateSold: { $exists: false },
        $or: [
            { financeCompany: { $exists: true, $ne: null } },
            { financeAmount: { $gt: 0 } },
        ],
    }).lean();

    const candidates = stale.filter((v) => {
        const hasFinancePayments = (v.salePayments ?? []).some(
            (p: { mode: string }) => p.mode === "Finance"
        );
        return !hasFinancePayments;
    });

    console.log(`Found ${candidates.length} vehicle(s) with stale finance data.`);

    for (const v of candidates) {
        await Vehicle.updateOne(
            { _id: v._id },
            {
                $unset: { financeCompany: "" },
                $set: { financeAmount: 0, financeStatus: "none" },
            }
        );
        console.log(`  Fixed: ${v.vehicleId} — ${v.make} ${v.model} (${v.registrationNo})`);
    }

    console.log("Done.");
    await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
