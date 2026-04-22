import mongoose from "mongoose";
import { Vehicle } from "../models/vehicle.model";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

export interface ExchangeDeal {
    // Source (sold vehicle)
    sourceId: string;
    sourceCollection: "vehicles" | "consignmentVehicles";
    sourceRefId: string;          // VH-xxxxx  or  CS-xxxxx
    sourceMake: string;
    sourceModel: string;
    sourceRegNo: string;
    sourceSoldTo: string;
    sourceSoldDate: Date | null;
    sourceSoldPrice: number;

    // Exchange payment entry
    exchangePaymentId: string;
    exchangeDate: Date;
    exchangeAmount: number;      // monetary value attributed to exchanged vehicle
    exchangeMake: string;
    exchangeRegNo: string;
    exchangeDetails?: string;

    // Exchange vehicle created (if any)
    exchangeCreatedRef: string | null;
    exchangeCreatedIn: "vehicles" | "consignmentVehicles" | null;
    exchangeCreatedRefId: string | null;  // vehicleId or consignmentId
    exchangeCreatedMake?: string;
    exchangeCreatedRegNo?: string;

    // Settlement
    sourceTotalCashReceived: number;
    sourceTotalReceived: number;   // cash + exchange
    sourceRemainingBalance: number;
    isFullySettled: boolean;
}

export interface ExchangeStats {
    totalExchanges: number;
    totalExchangeValue: number;
    totalRemainingBalance: number;
    exchangesFromVehicles: number;
    exchangesFromConsignments: number;
    fullySettled: number;
    pendingSettlement: number;
}

interface ExchangeQuery {
    collection?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

// ── Fetch exchange deals from Phase 2 (Vehicle salePayments) ──────
async function getVehicleExchangeDeals(dateFrom?: string, dateTo?: string): Promise<ExchangeDeal[]> {
    const match: Record<string, unknown> = { isActive: true, "salePayments.type": "exchange" };
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        match["salePayments.date"] = df;
    }

    const vehicles = await Vehicle.find(match)
        .select("vehicleId make model registrationNo soldTo dateSold soldPrice receivedAmount balanceAmount salePayments")
        .lean();

    const deals: ExchangeDeal[] = [];

    for (const v of vehicles) {
        const exchangePayments = v.salePayments.filter(p => p.type === "exchange");
        for (const ep of exchangePayments) {
            const cashPayments = v.salePayments.filter(p => p.type !== "exchange");
            const cashReceived = cashPayments.reduce((s, p) => s + p.amount, 0);

            // Look up exchange vehicle if created
            let exchangeCreatedRefId: string | null = null;
            let exchangeCreatedMake: string | undefined;
            let exchangeCreatedRegNo: string | undefined;

            if (ep.exchangeCreatedRef && ep.exchangeCreatedIn) {
                try {
                    if (ep.exchangeCreatedIn === "vehicles") {
                        const exV = await Vehicle.findById(ep.exchangeCreatedRef).select("vehicleId make registrationNo").lean();
                        if (exV) { exchangeCreatedRefId = exV.vehicleId; exchangeCreatedMake = exV.make; exchangeCreatedRegNo = exV.registrationNo; }
                    } else {
                        const exC = await ConsignmentVehicle.findById(ep.exchangeCreatedRef).select("consignmentId make registrationNo").lean();
                        if (exC) { exchangeCreatedRefId = exC.consignmentId; exchangeCreatedMake = exC.make; exchangeCreatedRegNo = exC.registrationNo; }
                    }
                } catch { /* ignore */ }
            }

            deals.push({
                sourceId: (v._id as mongoose.Types.ObjectId).toString(),
                sourceCollection: "vehicles",
                sourceRefId: v.vehicleId,
                sourceMake: v.make,
                sourceModel: v.model,
                sourceRegNo: v.registrationNo,
                sourceSoldTo: v.soldTo || "—",
                sourceSoldDate: v.dateSold || null,
                sourceSoldPrice: v.soldPrice || 0,

                exchangePaymentId: (ep._id as mongoose.Types.ObjectId).toString(),
                exchangeDate: ep.date,
                exchangeAmount: ep.amount,
                exchangeMake: ep.exchangeVehicleMake || "Unknown",
                exchangeRegNo: ep.exchangeVehicleRegNo || "—",
                exchangeDetails: ep.exchangeDetails,

                exchangeCreatedRef: ep.exchangeCreatedRef ? ep.exchangeCreatedRef.toString() : null,
                exchangeCreatedIn: ep.exchangeCreatedIn || null,
                exchangeCreatedRefId,
                exchangeCreatedMake,
                exchangeCreatedRegNo,

                sourceTotalCashReceived: cashReceived,
                sourceTotalReceived: cashReceived + ep.amount,
                sourceRemainingBalance: Math.max(0, (v.soldPrice || 0) - (cashReceived + ep.amount)),
                isFullySettled: ((v.soldPrice || 0) - (cashReceived + ep.amount)) <= 0,
            });
        }
    }

    return deals;
}

// ── Fetch exchange deals from Phase 3 (Consignment buyerPayments) ──
async function getConsignmentExchangeDeals(dateFrom?: string, dateTo?: string): Promise<ExchangeDeal[]> {
    const match: Record<string, unknown> = { isActive: true, "buyerPayments.type": "exchange" };
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        match["buyerPayments.date"] = df;
    }

    const consignments = await ConsignmentVehicle.find(match)
        .select("consignmentId make model registrationNo soldTo dateSold soldPrice receivedAmount buyerBalance buyerPayments")
        .lean();

    const deals: ExchangeDeal[] = [];

    for (const c of consignments) {
        const exchangePayments = c.buyerPayments.filter(p => p.type === "exchange");
        for (const ep of exchangePayments) {
            const cashPayments = c.buyerPayments.filter(p => p.type !== "exchange");
            const cashReceived = cashPayments.reduce((s, p) => s + p.amount, 0);

            let exchangeCreatedRefId: string | null = null;
            let exchangeCreatedMake: string | undefined;
            let exchangeCreatedRegNo: string | undefined;

            if (ep.exchangeCreatedRef && ep.exchangeCreatedIn) {
                try {
                    if (ep.exchangeCreatedIn === "vehicles") {
                        const exV = await Vehicle.findById(ep.exchangeCreatedRef).select("vehicleId make registrationNo").lean();
                        if (exV) { exchangeCreatedRefId = exV.vehicleId; exchangeCreatedMake = exV.make; exchangeCreatedRegNo = exV.registrationNo; }
                    } else {
                        const exC = await ConsignmentVehicle.findById(ep.exchangeCreatedRef).select("consignmentId make registrationNo").lean();
                        if (exC) { exchangeCreatedRefId = exC.consignmentId; exchangeCreatedMake = exC.make; exchangeCreatedRegNo = exC.registrationNo; }
                    }
                } catch { /* ignore */ }
            }

            deals.push({
                sourceId: (c._id as mongoose.Types.ObjectId).toString(),
                sourceCollection: "consignmentVehicles",
                sourceRefId: c.consignmentId,
                sourceMake: c.make,
                sourceModel: c.model,
                sourceRegNo: c.registrationNo,
                sourceSoldTo: c.soldTo || "—",
                sourceSoldDate: c.dateSold || null,
                sourceSoldPrice: c.soldPrice || 0,

                exchangePaymentId: (ep._id as mongoose.Types.ObjectId).toString(),
                exchangeDate: ep.date,
                exchangeAmount: ep.amount,
                exchangeMake: ep.exchangeVehicleMake || "Unknown",
                exchangeRegNo: ep.exchangeVehicleRegNo || "—",
                exchangeDetails: undefined,

                exchangeCreatedRef: ep.exchangeCreatedRef ? ep.exchangeCreatedRef.toString() : null,
                exchangeCreatedIn: ep.exchangeCreatedIn || null,
                exchangeCreatedRefId,
                exchangeCreatedMake,
                exchangeCreatedRegNo,

                sourceTotalCashReceived: cashReceived,
                sourceTotalReceived: cashReceived + ep.amount,
                sourceRemainingBalance: Math.max(0, (c.soldPrice || 0) - (cashReceived + ep.amount)),
                isFullySettled: ((c.soldPrice || 0) - (cashReceived + ep.amount)) <= 0,
            });
        }
    }

    return deals;
}

// ── Public API ────────────────────────────────────────────────────
export const getExchanges = async (query: ExchangeQuery) => {
    const { collection, dateFrom, dateTo, page = 1, limit = 20 } = query;

    let deals: ExchangeDeal[] = [];

    if (!collection || collection === "vehicles") {
        deals = deals.concat(await getVehicleExchangeDeals(dateFrom, dateTo));
    }
    if (!collection || collection === "consignmentVehicles") {
        deals = deals.concat(await getConsignmentExchangeDeals(dateFrom, dateTo));
    }

    // Sort by exchange date desc
    deals.sort((a, b) => new Date(b.exchangeDate).getTime() - new Date(a.exchangeDate).getTime());

    const total = deals.length;
    const skip = (page - 1) * limit;
    const paged = deals.slice(skip, skip + limit);

    return { data: paged, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getExchangeStats = async (): Promise<ExchangeStats> => {
    const [vDeals, cDeals] = await Promise.all([
        getVehicleExchangeDeals(),
        getConsignmentExchangeDeals(),
    ]);

    const all = [...vDeals, ...cDeals];

    return {
        totalExchanges: all.length,
        totalExchangeValue: all.reduce((s, d) => s + d.exchangeAmount, 0),
        totalRemainingBalance: all.reduce((s, d) => s + d.sourceRemainingBalance, 0),
        exchangesFromVehicles: vDeals.length,
        exchangesFromConsignments: cDeals.length,
        fullySettled: all.filter(d => d.isFullySettled).length,
        pendingSettlement: all.filter(d => !d.isFullySettled).length,
    };
};
