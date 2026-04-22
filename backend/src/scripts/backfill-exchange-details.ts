/**
 * One-time script to backfill `exchangeDetails` on existing consignments
 * that were created as exchange vehicles but lack the field.
 *
 * Run with: npx ts-node -e "require('./src/scripts/backfill-exchange-details')"
 * Or via: node --require ts-node/register src/scripts/backfill-exchange-details.ts
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import { ConsignmentVehicle } from "../models/consignment-vehicle.model";
import { Vehicle } from "../models/vehicle.model";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vehicleshop";

async function backfill() {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all consignments that entered via exchange but have no exchangeDetails
    const exchangeConsignments = await ConsignmentVehicle.find({
        isFromExchange: true,
        exchangeSourceRef: { $exists: true },
        $or: [{ exchangeDetails: { $exists: false } }, { exchangeDetails: "" }, { exchangeDetails: null }],
    });

    console.log(`Found ${exchangeConsignments.length} exchange consignments to backfill`);

    for (const consignment of exchangeConsignments) {
        try {
            let sourceVehicleInfo = "";

            if (consignment.exchangeSourceCollection === "vehicles" && consignment.exchangeSourceRef) {
                const sourceVehicle = await Vehicle.findById(consignment.exchangeSourceRef)
                    .select("make model registrationNo soldTo soldPrice")
                    .lean();

                if (sourceVehicle) {
                    sourceVehicleInfo = `Exchange from sale: ${sourceVehicle.make} ${sourceVehicle.model} (${sourceVehicle.registrationNo}) — sold to ${sourceVehicle.soldTo || "buyer"} for ₹${(sourceVehicle.soldPrice || 0).toLocaleString("en-IN")}`;
                }
            } else if (consignment.exchangeSourceCollection === "consignmentVehicles" && consignment.exchangeSourceRef) {
                const sourceConsignment = await ConsignmentVehicle.findById(consignment.exchangeSourceRef)
                    .select("make model registrationNo soldTo soldPrice")
                    .lean();

                if (sourceConsignment) {
                    sourceVehicleInfo = `Exchange from sale: ${sourceConsignment.make} ${sourceConsignment.model} (${sourceConsignment.registrationNo}) — sold to ${sourceConsignment.soldTo || "buyer"} for ₹${(sourceConsignment.soldPrice || 0).toLocaleString("en-IN")}`;
                }
            }

            if (sourceVehicleInfo) {
                consignment.exchangeDetails = sourceVehicleInfo;
                await consignment.save();
                console.log(`  ✅ Backfilled ${consignment.consignmentId}: ${sourceVehicleInfo}`);
            } else {
                console.log(`  ⚠️  Could not find source for ${consignment.consignmentId} (sourceRef: ${consignment.exchangeSourceRef})`);
            }
        } catch (err) {
            console.error(`  ❌ Error for ${consignment.consignmentId}:`, err);
        }
    }

    console.log("\n✅ Backfill complete");
    await mongoose.disconnect();
}

backfill().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
