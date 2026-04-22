import mongoose from "mongoose";
import { ConsignmentVehicle, IConsignmentVehicle } from "../models/consignment-vehicle.model";
import { Vehicle } from "../models/vehicle.model";
import { getNextId } from "./counter.service";

interface ConsignmentQuery {
    saleType?: string;
    vehicleType?: string;
    status?: string;
    settlementStatus?: string;
    buyerPaymentStatus?: string;
    payeePaymentStatus?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

// ── Maps cost breakdown category → field name ─────────────────────
const CATEGORY_TO_FIELD: Record<string, string> = {
    workshop: "workshopRepairCost",
    spareParts: "sparePartsAccessories",
    painting: "paintingPolishingCost",
    washing: "washingDetailingCost",
    fuel: "fuelCost",
    paperwork: "paperworkTaxInsurance",
    commission: "commission",
    other: "otherExpenses",
};

const syncCostFieldsFromBreakdowns = (vehicle: IConsignmentVehicle) => {
    for (const breakdown of vehicle.costBreakdowns) {
        const field = CATEGORY_TO_FIELD[breakdown.category];
        if (field && breakdown.items.length > 0) {
            const total = breakdown.items.reduce((sum, item) => sum + (item.amount || 0), 0);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (vehicle as any)[field] = total;
        }
    }
};

// ── CRUD ──────────────────────────────────────────────────────────

export const createConsignment = async (data: Partial<IConsignmentVehicle>): Promise<IConsignmentVehicle> => {
    const consignmentId = await getNextId("consignment");
    const vehicle = new ConsignmentVehicle({ ...data, consignmentId });
    await vehicle.save();
    vehicle.activityLog.push({
        action: "created",
        description: `${data.saleType === "park_sale" ? "Park Sale" : "Finance Sale"} registered: ${data.make} ${data.model} (${data.registrationNo}) from ${data.previousOwner}`,
        date: new Date(),
    });
    await vehicle.save();
    return vehicle;
};

export const getConsignments = async (query: ConsignmentQuery) => {
    const { saleType, vehicleType, status, settlementStatus, buyerPaymentStatus, payeePaymentStatus, search, dateFrom, dateTo, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = { isActive: true };

    if (saleType) filter.saleType = saleType;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;
    if (settlementStatus) filter.settlementStatus = settlementStatus;
    if (buyerPaymentStatus) filter.buyerPaymentStatus = buyerPaymentStatus;
    if (payeePaymentStatus) filter.payeePaymentStatus = payeePaymentStatus;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        filter.dateReceived = df;
    }
    if (search) filter.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        ConsignmentVehicle.find(filter).sort({ dateReceived: -1 }).skip(skip).limit(limit).lean(),
        ConsignmentVehicle.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getConsignmentById = async (id: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return ConsignmentVehicle.findOne({ _id: id, isActive: true });
};

export const updateConsignment = async (id: string, data: Partial<IConsignmentVehicle>): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    Object.assign(vehicle, data);
    vehicle.activityLog.push({ action: "updated", description: "Consignment details updated", date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const deleteConsignment = async (id: string): Promise<boolean> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await ConsignmentVehicle.findOneAndUpdate({ _id: id, isActive: true }, { $set: { isActive: false } });
    return !!result;
};

export const updateConsignmentStatus = async (id: string, status: IConsignmentVehicle["status"], notes?: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.status = status;
    vehicle.activityLog.push({ action: "status_changed", description: `Status changed to ${status}${notes ? `: ${notes}` : ""}`, date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const returnConsignment = async (id: string, notes?: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.status = "returned";
    vehicle.activityLog.push({ action: "returned", description: `Vehicle returned to ${vehicle.previousOwner}${notes ? `: ${notes}` : ""}`, date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const getConsignmentStats = async (saleType?: string) => {
    const match: Record<string, unknown> = { isActive: true };
    if (saleType) match.saleType = saleType;

    const stats = await ConsignmentVehicle.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$saleType",
                total: { $sum: 1 },
                inShop: { $sum: { $cond: [{ $in: ["$status", ["received", "reconditioning", "ready_for_sale"]] }, 1, 0] } },
                sold: { $sum: { $cond: [{ $in: ["$status", ["sold", "sold_pending"]] }, 1, 0] } },
                returned: { $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } },
                totalInvested: { $sum: "$totalInvestment" },
                totalRevenue: { $sum: { $ifNull: ["$soldPrice", 0] } },
                totalNetProfit: { $sum: { $cond: [{ $ne: ["$dateSold", null] }, "$netProfit", 0] } },
                pendingBuyerCount: { $sum: { $cond: [{ $gt: ["$buyerBalance", 0] }, 1, 0] } },
                pendingBuyerAmt: { $sum: "$buyerBalance" },
                pendingPayeeCount: { $sum: { $cond: [{ $in: ["$payeePaymentStatus", ["not_started", "partial"]] }, 1, 0] } },
                pendingPayeeAmt: { $sum: "$payeeBalance" },
            },
        },
    ]);

    const parkSale = stats.find(s => s._id === "park_sale") ?? { total: 0, inShop: 0, sold: 0, returned: 0, totalInvested: 0, totalRevenue: 0, totalNetProfit: 0 };
    const financeSale = stats.find(s => s._id === "finance_sale") ?? { total: 0, inShop: 0, sold: 0, returned: 0, totalInvested: 0, totalRevenue: 0, totalNetProfit: 0 };

    const combined = {
        totalVehicles: parkSale.total + financeSale.total,
        currentlyInShop: parkSale.inShop + financeSale.inShop,
        sold: parkSale.sold + financeSale.sold,
        returned: parkSale.returned + financeSale.returned,
        totalInvested: parkSale.totalInvested + financeSale.totalInvested,
        totalRevenue: parkSale.totalRevenue + financeSale.totalRevenue,
        totalNetProfit: parkSale.totalNetProfit + financeSale.totalNetProfit,
        avgMargin: 0,
        pendingBuyerPayments: {
            count: (parkSale.pendingBuyerCount || 0) + (financeSale.pendingBuyerCount || 0),
            amount: (parkSale.pendingBuyerAmt || 0) + (financeSale.pendingBuyerAmt || 0),
        },
        pendingPayeePayments: {
            count: (parkSale.pendingPayeeCount || 0) + (financeSale.pendingPayeeCount || 0),
            amount: (parkSale.pendingPayeeAmt || 0) + (financeSale.pendingPayeeAmt || 0),
        },
        parkSale: { total: parkSale.total, inShop: parkSale.inShop, sold: parkSale.sold },
        financeSale: { total: financeSale.total, inShop: financeSale.inShop, sold: financeSale.sold },
    };
    combined.avgMargin = combined.totalInvested > 0
        ? parseFloat(((combined.totalNetProfit / combined.totalInvested) * 100).toFixed(2))
        : 0;

    return combined;
};

// ── Costs ─────────────────────────────────────────────────────────

export const updateCosts = async (id: string, costs: Record<string, number>): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    Object.assign(vehicle, costs);
    syncCostFieldsFromBreakdowns(vehicle);
    vehicle.activityLog.push({ action: "costs_updated", description: "Reconditioning costs updated", date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const addCostBreakdownItem = async (id: string, category: string, item: { name: string; amount: number; date?: string; notes?: string }): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    let breakdown = vehicle.costBreakdowns.find(b => b.category === category);
    if (!breakdown) {
        vehicle.costBreakdowns.push({ category: category as IConsignmentVehicle["costBreakdowns"][0]["category"], items: [] });
        breakdown = vehicle.costBreakdowns[vehicle.costBreakdowns.length - 1];
    }
    breakdown.items.push({
        _id: new mongoose.Types.ObjectId(),
        name: item.name,
        amount: item.amount,
        date: item.date ? new Date(item.date) : undefined,
        notes: item.notes,
    });
    syncCostFieldsFromBreakdowns(vehicle);
    vehicle.activityLog.push({ action: "cost_item_added", description: `Added ${category} cost: ${item.name} ₹${item.amount}`, amount: item.amount, date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const deleteCostBreakdownItem = async (id: string, itemId: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    for (const breakdown of vehicle.costBreakdowns) {
        const before = breakdown.items.length;
        breakdown.items = breakdown.items.filter(item => item._id.toString() !== itemId);
        if (before !== breakdown.items.length) {
            const field = CATEGORY_TO_FIELD[breakdown.category];
            if (field) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (vehicle as any)[field] = breakdown.items.reduce((s, i) => s + (i.amount || 0), 0);
            }
        }
    }
    vehicle.activityLog.push({ action: "cost_item_deleted", description: "Cost breakdown item removed", date: new Date() });
    await vehicle.save();
    return vehicle;
};

// ── Sale ──────────────────────────────────────────────────────────

export const recordSale = async (id: string, data: { dateSold: string; soldPrice: number; soldTo: string; soldToPhone?: string; remarks?: string }): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    vehicle.dateSold = new Date(data.dateSold);
    vehicle.soldPrice = data.soldPrice;
    vehicle.soldTo = data.soldTo;
    if (data.soldToPhone) vehicle.soldToPhone = data.soldToPhone;
    if (data.remarks) vehicle.remarks = data.remarks;

    vehicle.activityLog.push({ action: "sold", description: `Sold to ${data.soldTo} for ₹${data.soldPrice.toLocaleString("en-IN")}`, amount: data.soldPrice, date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const undoSale = async (id: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    vehicle.dateSold = undefined;
    vehicle.soldPrice = undefined;
    vehicle.soldTo = undefined;
    vehicle.soldToPhone = undefined;
    vehicle.status = "ready_for_sale";
    vehicle.buyerPayments = [];
    vehicle.payeePayments = [];
    vehicle.settlementStatus = "open";
    vehicle.activityLog.push({ action: "sale_undone", description: "Sale record reverted", date: new Date() });
    await vehicle.save();
    return vehicle;
};

// ── Buyer Payments ────────────────────────────────────────────────

export const addBuyerPayment = async (id: string, payment: {
    date: string; amount: number; mode: string; type?: string;
    exchangeDetails?: string; exchangeVehicleMake?: string; exchangeVehicleRegNo?: string;
    referenceNo?: string; notes?: string;
    createExchangeAs?: string; exchangeVehicleType?: string;
}): Promise<{ vehicle: IConsignmentVehicle; exchangeVehicle?: Record<string, unknown> } | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    const paymentEntry: IConsignmentVehicle["buyerPayments"][0] = {
        _id: new mongoose.Types.ObjectId(),
        date: new Date(payment.date),
        amount: payment.amount,
        mode: payment.mode as IConsignmentVehicle["buyerPayments"][0]["mode"],
        type: (payment.type as "cash" | "exchange") ?? "cash",
        exchangeDetails: payment.exchangeDetails,
        exchangeVehicleMake: payment.exchangeVehicleMake,
        exchangeVehicleRegNo: payment.exchangeVehicleRegNo,
        referenceNo: payment.referenceNo,
        notes: payment.notes,
    };

    let exchangeVehicle = null;

    // Auto-create exchange vehicle
    if (payment.type === "exchange" && payment.exchangeVehicleMake && payment.createExchangeAs && payment.createExchangeAs !== "skip") {
        const regNo = payment.exchangeVehicleRegNo || `EXCH-${Date.now()}`;
        const vType = (payment.exchangeVehicleType || "two_wheeler") as "two_wheeler" | "four_wheeler";
        // Split combined "Make Model" string correctly
        const makeParts = (payment.exchangeVehicleMake || "").trim().split(/\s+/);
        const exMake = makeParts[0] || payment.exchangeVehicleMake || "Unknown";
        const exModel = makeParts.slice(1).join(" ") || exMake;

        if (payment.createExchangeAs === "phase2_purchase") {
            const newVehicleId = await getNextId("vehicle");
            const exVehicle = new Vehicle({
                vehicleId: newVehicleId,
                vehicleType: vType,
                make: exMake,
                model: exModel,
                registrationNo: regNo,
                purchasedFrom: vehicle.soldTo || "Exchange",
                datePurchased: new Date(payment.date),
                purchasePrice: payment.amount,
                fundingSource: "own",
                isFromExchange: true,
                exchangeSourceRef: vehicle._id as mongoose.Types.ObjectId,
                exchangeSourceCollection: "consignmentVehicles",
                exchangeDetails: `Exchange from ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo})`,
                status: "in_stock",
            });
            await exVehicle.save();
            paymentEntry.exchangeCreatedRef = exVehicle._id as mongoose.Types.ObjectId;
            paymentEntry.exchangeCreatedIn = "vehicles";
            exchangeVehicle = { vehicleId: exVehicle.vehicleId, collection: "vehicles", make: exVehicle.make, registrationNo: exVehicle.registrationNo, message: "Created as Phase 2 purchase" };
        } else {
            // phase3_park_sale or phase3_finance_sale
            const saleType = payment.createExchangeAs === "phase3_park_sale" ? "park_sale" : "finance_sale";
            const newConsignmentId = await getNextId("consignment");
            const exConsignment = new ConsignmentVehicle({
                consignmentId: newConsignmentId,
                saleType,
                vehicleType: vType,
                make: exMake,
                model: exModel,
                registrationNo: regNo,
                previousOwner: vehicle.soldTo || "Exchange",
                previousOwnerPhone: vehicle.soldToPhone,
                dateReceived: new Date(payment.date),
                purchasePrice: payment.amount,
                isFromExchange: true,
                exchangeSourceRef: vehicle._id as mongoose.Types.ObjectId,
                exchangeSourceCollection: "consignmentVehicles",
                exchangeDetails: `Exchange from sale: ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo}) — sold to ${vehicle.soldTo || "buyer"} for ₹${(vehicle.soldPrice || 0).toLocaleString("en-IN")}`,
                status: "received",
            });
            await exConsignment.save();
            paymentEntry.exchangeCreatedRef = exConsignment._id as mongoose.Types.ObjectId;
            paymentEntry.exchangeCreatedIn = "consignmentVehicles";
            exchangeVehicle = { consignmentId: exConsignment.consignmentId, collection: "consignmentVehicles", make: exConsignment.make, registrationNo: exConsignment.registrationNo, message: `Created as Phase 3 ${saleType.replace("_", " ")}` };
        }
    }

    vehicle.buyerPayments.push(paymentEntry);
    vehicle.activityLog.push({ action: "buyer_payment", description: `Buyer payment received: ₹${payment.amount.toLocaleString("en-IN")} via ${payment.mode}${payment.type === "exchange" ? " (exchange)" : ""}`, amount: payment.amount, date: new Date() });
    await vehicle.save();
    return { vehicle, exchangeVehicle: exchangeVehicle ?? undefined };
};

export const deleteBuyerPayment = async (id: string, paymentId: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.buyerPayments = vehicle.buyerPayments.filter(p => p._id.toString() !== paymentId);
    vehicle.activityLog.push({ action: "buyer_payment_deleted", description: "Buyer payment removed", date: new Date() });
    await vehicle.save();
    return vehicle;
};

// ── Payee Payments ────────────────────────────────────────────────

export const addPayeePayment = async (id: string, payment: { date: string; amount: number; mode: string; notes?: string; markClosed?: boolean }): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    vehicle.payeePayments.push({
        _id: new mongoose.Types.ObjectId(),
        date: new Date(payment.date),
        amount: payment.amount,
        mode: payment.mode as IConsignmentVehicle["payeePayments"][0]["mode"],
        notes: payment.notes,
    });

    if (payment.markClosed) {
        vehicle.payeePaymentStatus = "closed";
    }

    const payeeLabel = vehicle.saleType === "park_sale" ? "Owner" : "Finance";
    vehicle.activityLog.push({ action: "payee_payment", description: `${payeeLabel} payment: ₹${payment.amount.toLocaleString("en-IN")} via ${payment.mode}${payment.markClosed ? " (Marked closed)" : ""}`, amount: payment.amount, date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const deletePayeePayment = async (id: string, paymentId: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.payeePayments = vehicle.payeePayments.filter(p => p._id.toString() !== paymentId);
    // Reset closed status if payments deleted
    if (vehicle.payeePaymentStatus === "closed") vehicle.payeePaymentStatus = "partial";
    vehicle.activityLog.push({ action: "payee_payment_deleted", description: "Payee payment removed", date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const closePayeeSettlement = async (id: string): Promise<IConsignmentVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await ConsignmentVehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.payeePaymentStatus = "closed";
    vehicle.activityLog.push({ action: "payee_settlement_closed", description: `${vehicle.saleType === "park_sale" ? "Owner" : "Finance"} settlement marked as closed`, date: new Date() });
    await vehicle.save();
    return vehicle;
};

// ── Reports ───────────────────────────────────────────────────────

export const getConsignmentReports = async (saleType?: string, dateFrom?: string, dateTo?: string) => {
    const match: Record<string, unknown> = { isActive: true };
    if (saleType) match.saleType = saleType;

    const soldMatch = { ...match, dateSold: { $ne: null } };
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        soldMatch.dateSold = df;
    }

    const [profitLoss, openSettlements, agingReport, monthlyTrends, costAnalysis] = await Promise.all([
        ConsignmentVehicle.find(soldMatch)
            .select("consignmentId saleType vehicleType make model registrationNo dateReceived dateSold purchasePrice totalReconCost totalInvestment soldPrice paidToPayee grossMargin netProfit profitLossPercentage daysInShop previousOwner settlementStatus")
            .sort({ dateSold: -1 })
            .lean(),
        ConsignmentVehicle.find({ ...match, dateSold: { $ne: null }, settlementStatus: { $ne: "fully_closed" } })
            .select("consignmentId saleType make model registrationNo dateSold soldPrice receivedAmount buyerBalance paidToPayee payeeBalance buyerPaymentStatus payeePaymentStatus settlementStatus previousOwner")
            .sort({ dateSold: -1 })
            .lean(),
        ConsignmentVehicle.find({ ...match, dateSold: null, status: { $nin: ["returned"] } })
            .select("consignmentId saleType vehicleType make model registrationNo dateReceived daysInShop totalInvestment status previousOwner")
            .sort({ daysInShop: -1 })
            .lean(),
        ConsignmentVehicle.aggregate([
            { $match: match },
            {
                $facet: {
                    byReceivedMonth: [
                        { $group: { _id: { year: { $year: "$dateReceived" }, month: { $month: "$dateReceived" }, saleType: "$saleType" }, count: { $sum: 1 }, totalInvested: { $sum: "$totalInvestment" } } },
                        { $sort: { "_id.year": 1, "_id.month": 1 } },
                    ],
                    bySoldMonth: [
                        { $match: { dateSold: { $ne: null } } },
                        { $group: { _id: { year: { $year: "$dateSold" }, month: { $month: "$dateSold" }, saleType: "$saleType" }, count: { $sum: 1 }, totalRevenue: { $sum: "$soldPrice" }, totalNetProfit: { $sum: "$netProfit" } } },
                        { $sort: { "_id.year": 1, "_id.month": 1 } },
                    ],
                },
            },
        ]),
        ConsignmentVehicle.aggregate([
            { $match: { isActive: true, dateSold: { $ne: null } } },
            {
                $group: {
                    _id: null,
                    avgWorkshop: { $avg: "$workshopRepairCost" },
                    avgSpareParts: { $avg: "$sparePartsAccessories" },
                    avgPainting: { $avg: "$paintingPolishingCost" },
                    avgWashing: { $avg: "$washingDetailingCost" },
                    avgFuel: { $avg: "$fuelCost" },
                    avgPaperwork: { $avg: "$paperworkTaxInsurance" },
                    avgCommission: { $avg: "$commission" },
                    avgOtherExpenses: { $avg: "$otherExpenses" },
                    avgTotalRecon: { $avg: "$totalReconCost" },
                },
            },
        ]),
    ]);

    return { profitLoss, openSettlements, agingReport, monthlyTrends: monthlyTrends[0], costAnalysis: costAnalysis[0] ?? {} };
};
