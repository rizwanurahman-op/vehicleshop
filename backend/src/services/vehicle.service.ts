import mongoose from "mongoose";
import { Vehicle, IVehicle } from "../models/vehicle.model";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";
import { getNextId } from "./counter.service";

interface VehicleQuery {
    vehicleType?: string;
    status?: string;
    saleStatus?: string;
    fundingSource?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export const createVehicle = async (data: Partial<IVehicle>): Promise<IVehicle> => {
    const vehicleId = await getNextId("vehicle");
    const vehicle = new Vehicle({ ...data, vehicleId });
    await vehicle.save();
    vehicle.activityLog.push({ action: "created", description: `Vehicle ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo}) purchased from ${vehicle.purchasedFrom}`, date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const getVehicles = async (query: VehicleQuery) => {
    const { vehicleType, status, saleStatus, fundingSource, search, dateFrom, dateTo, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = { isActive: true };

    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;
    if (saleStatus) filter.saleStatus = saleStatus;
    if (fundingSource) filter.fundingSource = fundingSource;
    if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);
        filter.datePurchased = dateFilter;
    }
    if (search) {
        filter.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        Vehicle.find(filter).sort({ datePurchased: -1 }).skip(skip).limit(limit).lean(),
        Vehicle.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
};

export const getVehicleById = async (id: string): Promise<IVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    return Vehicle.findOne({ _id: id, isActive: true });
};

export const updateVehicle = async (id: string, data: Partial<IVehicle>): Promise<IVehicle | null> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOneAndUpdate({ _id: id, isActive: true }, { $set: data }, { new: true, runValidators: true });
    return vehicle;
};

export const deleteVehicle = async (id: string): Promise<boolean> => {
    if (!mongoose.Types.ObjectId.isValid(id)) return false;
    const result = await Vehicle.findOneAndUpdate({ _id: id, isActive: true }, { $set: { isActive: false } });
    return !!result;
};

export const getVehicleStats = async () => {
    const stats = await Vehicle.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: "$vehicleType",
                total: { $sum: 1 },
                inStock: { $sum: { $cond: [{ $eq: ["$status", "in_stock"] }, 1, 0] } },
                sold: { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
                soldPending: { $sum: { $cond: [{ $eq: ["$status", "sold_pending"] }, 1, 0] } },
                exchanged: { $sum: { $cond: [{ $eq: ["$status", "exchanged"] }, 1, 0] } },
                totalInvested: { $sum: "$totalInvestment" },
                totalRevenue: { $sum: { $ifNull: ["$soldPrice", 0] } },
                totalReceived: { $sum: "$receivedAmount" },
                totalBalancePending: { $sum: "$balanceAmount" },
                netProfit: { $sum: { $cond: [{ $ne: ["$dateSold", null] }, "$profitLoss", 0] } },
            },
        },
    ]);

    const twoWheeler = stats.find((s) => s._id === "two_wheeler") ?? { total: 0, inStock: 0, sold: 0, soldPending: 0, exchanged: 0, totalInvested: 0, totalRevenue: 0, totalReceived: 0, totalBalancePending: 0, netProfit: 0 };
    const fourWheeler = stats.find((s) => s._id === "four_wheeler") ?? { total: 0, inStock: 0, sold: 0, soldPending: 0, exchanged: 0, totalInvested: 0, totalRevenue: 0, totalReceived: 0, totalBalancePending: 0, netProfit: 0 };

    const combined = {
        total: twoWheeler.total + fourWheeler.total,
        inStock: twoWheeler.inStock + fourWheeler.inStock,
        sold: twoWheeler.sold + fourWheeler.sold,
        soldPending: twoWheeler.soldPending + fourWheeler.soldPending,
        exchanged: twoWheeler.exchanged + fourWheeler.exchanged,
        totalInvested: twoWheeler.totalInvested + fourWheeler.totalInvested,
        totalRevenue: twoWheeler.totalRevenue + fourWheeler.totalRevenue,
        totalReceived: twoWheeler.totalReceived + fourWheeler.totalReceived,
        totalBalancePending: twoWheeler.totalBalancePending + fourWheeler.totalBalancePending,
        netProfit: twoWheeler.netProfit + fourWheeler.netProfit,
        avgMargin: 0,
    };
    combined.avgMargin = combined.totalInvested > 0 ? parseFloat(((combined.netProfit / combined.totalInvested) * 100).toFixed(2)) : 0;

    const pendingItems = await Vehicle.aggregate([
        { $match: { isActive: true } },
        {
            $facet: {
                balancePending: [
                    { $match: { saleStatus: "balance_pending" } },
                    { $project: { vehicleId: 1, vehicleType: 1, make: 1, model: 1, registrationNo: 1, amount: "$balanceAmount" } },
                ],
                nocPending: [
                    { $match: { nocStatus: "pending" } },
                    { $project: { vehicleId: 1, vehicleType: 1, make: 1, model: 1, registrationNo: 1 } },
                ],
                purchasePaymentsDue: [
                    { $match: { purchasePaymentStatus: { $in: ["pending", "partial"] } } },
                    { $project: { vehicleId: 1, vehicleType: 1, make: 1, model: 1, registrationNo: 1, amount: "$purchasePendingAmount" } },
                ],
            },
        },
    ]);

    const pi = pendingItems[0] as { balancePending: { amount: number }[]; nocPending: unknown[]; purchasePaymentsDue: { amount: number }[] };

    const fundingBreakdown = await Vehicle.aggregate([
        { $match: { isActive: true } },
        { $unwind: { path: "$fundingDetails", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { source: "$fundingDetails.source", lenderName: "$fundingDetails.lenderName" },
                amount: { $sum: { $ifNull: ["$fundingDetails.amount", 0] } },
                vehicleCount: { $sum: 1 },
            },
        },
    ]);

    const ownMoney = fundingBreakdown.filter((f) => f._id.source === "own").reduce((s: number, f) => s + f.amount, 0);
    const investorMoney = fundingBreakdown.filter((f) => f._id.source !== "own").reduce((s: number, f) => s + f.amount, 0);

    const recentActivity = await Vehicle.find({ isActive: true })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select("vehicleId vehicleType make model registrationNo datePurchased dateSold purchasePrice soldPrice status activityLog")
        .lean();

    return {
        twoWheelers: twoWheeler,
        fourWheelers: fourWheeler,
        combined,
        pendingItems: {
            balancePending: {
                count: pi.balancePending.length,
                totalAmount: pi.balancePending.reduce((s, v) => s + (v.amount || 0), 0),
                vehicles: pi.balancePending,
            },
            nocPending: { count: pi.nocPending.length, vehicles: pi.nocPending },
            purchasePaymentsDue: {
                count: pi.purchasePaymentsDue.length,
                totalAmount: pi.purchasePaymentsDue.reduce((s, v) => s + (v.amount || 0), 0),
                vehicles: pi.purchasePaymentsDue,
            },
        },
        fundingBreakdown: { ownMoney, investorMoney },
        recentActivity,
    };
};

// ── Sale Management ──────────────────────────────────────────────
export const recordSale = async (id: string, data: { dateSold: string; soldPrice: number; soldTo: string; soldToPhone?: string; nocStatus?: string; remarks?: string }) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    vehicle.dateSold = new Date(data.dateSold);
    vehicle.soldPrice = data.soldPrice;
    vehicle.soldTo = data.soldTo;
    if (data.soldToPhone) vehicle.soldToPhone = data.soldToPhone;
    if (data.nocStatus) vehicle.nocStatus = data.nocStatus as IVehicle["nocStatus"];
    if (data.remarks) vehicle.remarks = data.remarks;

    vehicle.activityLog.push({
        action: "sold",
        description: `Sold to ${data.soldTo} for ₹${data.soldPrice.toLocaleString("en-IN")}`,
        amount: data.soldPrice,
        date: new Date(),
    });
    await vehicle.save();
    return vehicle;
};

export const undoSale = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    vehicle.dateSold = undefined;
    vehicle.soldPrice = undefined;
    vehicle.soldTo = undefined;
    vehicle.soldToPhone = undefined;
    vehicle.saleStatus = null;
    vehicle.status = "in_stock";
    vehicle.salePayments = [];
    vehicle.receivedAmount = 0;
    vehicle.balanceAmount = 0;
    vehicle.activityLog.push({ action: "sale_undone", description: "Sale record reverted", date: new Date() });
    await vehicle.save();
    return vehicle;
};

// ── Purchase Payments ────────────────────────────────────────────
export const addPurchasePayment = async (id: string, payment: { date: string; amount: number; mode: string; bankAccount?: string; notes?: string }) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    vehicle.purchasePayments.push({
        _id: new mongoose.Types.ObjectId(),
        date: new Date(payment.date),
        amount: payment.amount,
        mode: payment.mode as IVehicle["purchasePayments"][0]["mode"],
        bankAccount: payment.bankAccount,
        notes: payment.notes,
    });
    vehicle.activityLog.push({
        action: "purchase_payment",
        description: `Purchase payment of ₹${payment.amount.toLocaleString("en-IN")} via ${payment.mode}${payment.bankAccount ? ` (${payment.bankAccount})` : ""}`,
        amount: payment.amount,
        date: new Date(),
    });
    await vehicle.save();
    return vehicle;
};

export const deletePurchasePayment = async (id: string, paymentId: string) => {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.purchasePayments = vehicle.purchasePayments.filter((p) => p._id.toString() !== paymentId);
    await vehicle.save();
    return vehicle;
};

// ── Sale Payments ────────────────────────────────────────────────
export const addSalePayment = async (id: string, payment: {
    date: string; amount: number; mode: string; type?: string;
    source?: string; exchangeDetails?: string; exchangeVehicleMake?: string;
    exchangeVehicleRegNo?: string; referenceNo?: string; notes?: string;
    createExchangeAs?: string; exchangeVehicleType?: string;
}) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    const paymentEntry: IVehicle["salePayments"][0] = {
        _id: new mongoose.Types.ObjectId(),
        date: new Date(payment.date),
        amount: payment.amount,
        mode: payment.mode as IVehicle["salePayments"][0]["mode"],
        type: (payment.type as "cash" | "exchange") ?? "cash",
        source: payment.source,
        exchangeDetails: payment.exchangeDetails,
        exchangeVehicleMake: payment.exchangeVehicleMake,
        exchangeVehicleRegNo: payment.exchangeVehicleRegNo,
        referenceNo: payment.referenceNo,
        notes: payment.notes,
    };

    let exchangeVehicle = null;

    // Auto-create exchange vehicle in the appropriate collection
    if (payment.type === "exchange" && payment.exchangeVehicleMake &&
        payment.createExchangeAs && payment.createExchangeAs !== "skip") {

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
                exchangeSourceCollection: "vehicles",
                exchangeDetails: `Exchange from ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo})`,
                status: "in_stock",
            });
            await exVehicle.save();
            paymentEntry.exchangeCreatedRef = exVehicle._id as mongoose.Types.ObjectId;
            paymentEntry.exchangeCreatedIn = "vehicles";
            vehicle.isExchange = true;
            vehicle.exchangeVehicleRef = exVehicle._id as mongoose.Types.ObjectId;
            exchangeVehicle = {
                id: exVehicle._id, vehicleId: exVehicle.vehicleId,
                make: exVehicle.make, registrationNo: exVehicle.registrationNo,
                collection: "vehicles", message: "Created as Phase 2 purchase",
            };
        } else {
            // phase3_park_sale or phase3_finance_sale
            const { ConsignmentVehicle } = await import("../models/consignment-vehicle.model");
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
                exchangeSourceCollection: "vehicles",
                exchangeDetails: `Exchange from sale: ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo}) — sold to ${vehicle.soldTo || "buyer"} for ₹${(vehicle.soldPrice || 0).toLocaleString("en-IN")}`,
                status: "received",
            });
            await exConsignment.save();
            paymentEntry.exchangeCreatedRef = exConsignment._id as mongoose.Types.ObjectId;
            paymentEntry.exchangeCreatedIn = "consignmentVehicles";
            vehicle.isExchange = true;
            vehicle.exchangeVehicleRef = exConsignment._id as mongoose.Types.ObjectId;
            exchangeVehicle = {
                id: exConsignment._id, consignmentId: exConsignment.consignmentId,
                make: exConsignment.make, registrationNo: exConsignment.registrationNo,
                collection: "consignmentVehicles",
                message: `Created as Phase 3 ${saleType.replace("_", " ")}`,
            };
        }
    }

    vehicle.salePayments.push(paymentEntry);
    vehicle.activityLog.push({
        action: "sale_payment",
        description: `Sale payment received: ₹${payment.amount.toLocaleString("en-IN")} via ${payment.mode}`,
        amount: payment.amount,
        date: new Date(),
    });
    await vehicle.save();
    return { vehicle, exchangeVehicle };
};

export const deleteSalePayment = async (id: string, paymentId: string) => {
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(paymentId)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    vehicle.salePayments = vehicle.salePayments.filter((p) => p._id.toString() !== paymentId);
    await vehicle.save();
    return vehicle;
};

// ── Cost Management ──────────────────────────────────────────────

// Maps breakdown category → IVehicle cost field name
const CATEGORY_TO_FIELD: Record<string, string> = {
    travel: "travelCost",
    workshop: "workshopRepairCost",
    spareParts: "sparePartsAccessories",
    alignment: "alignmentWork",
    painting: "paintingPolishingCost",
    washing: "washingDetailingCost",
    fuel: "fuelCost",
    paperwork: "paperworkTaxInsurance",
    commission: "commission",
    other: "otherExpenses",
};

// Recalculate all category cost fields from their breakdown items
const syncCostFieldsFromBreakdowns = (vehicle: IVehicle) => {
    for (const breakdown of vehicle.costBreakdowns) {
        const field = CATEGORY_TO_FIELD[breakdown.category];
        if (field) {
            const total = breakdown.items.reduce((sum, item) => sum + (item.amount || 0), 0);
            // Only override if breakdown items exist (don't erase manual amounts)
            if (breakdown.items.length > 0) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (vehicle as any)[field] = total;
            }
        }
    }
};

export const updateCosts = async (id: string, costs: Partial<IVehicle>) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    Object.assign(vehicle, costs);
    // After manual update, still sync any categories that have items
    syncCostFieldsFromBreakdowns(vehicle);
    vehicle.activityLog.push({ action: "costs_updated", description: "Reconditioning costs updated", date: new Date() });
    await vehicle.save();
    return vehicle;
};

// Recalculate all cost fields from breakdown items (fixes stale data)
export const recalcCosts = async (id: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;
    syncCostFieldsFromBreakdowns(vehicle);
    vehicle.activityLog.push({ action: "costs_recalculated", description: "Cost fields recalculated from breakdown items", date: new Date() });
    await vehicle.save();
    return vehicle;
};

export const addCostBreakdownItem = async (id: string, category: string, item: { name: string; amount: number; date?: string; notes?: string }) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    let breakdown = vehicle.costBreakdowns.find((b) => b.category === category);
    if (!breakdown) {
        vehicle.costBreakdowns.push({ category: category as IVehicle["costBreakdowns"][0]["category"], items: [] });
        breakdown = vehicle.costBreakdowns[vehicle.costBreakdowns.length - 1];
    }
    breakdown.items.push({
        _id: new mongoose.Types.ObjectId(),
        name: item.name,
        amount: item.amount,
        date: item.date ? new Date(item.date) : undefined,
        notes: item.notes,
    });

    // ── Auto-sync: update the category cost field with sum of all breakdown items ──
    syncCostFieldsFromBreakdowns(vehicle);

    vehicle.activityLog.push({
        action: "cost_item_added",
        description: `Added ${category} cost item: ${item.name} ₹${item.amount.toLocaleString("en-IN")}`,
        amount: item.amount,
        date: new Date(),
    });
    await vehicle.save();
    return vehicle;
};

export const deleteCostBreakdownItem = async (id: string, itemId: string) => {
    if (!mongoose.Types.ObjectId.isValid(id)) return null;
    const vehicle = await Vehicle.findOne({ _id: id, isActive: true });
    if (!vehicle) return null;

    for (const breakdown of vehicle.costBreakdowns) {
        const before = breakdown.items.length;
        breakdown.items = breakdown.items.filter((item) => item._id.toString() !== itemId);
        const deleted = before !== breakdown.items.length;
        if (deleted) {
            // ── Auto-sync: if all items removed, reset field to 0; otherwise sum remaining ──
            const field = CATEGORY_TO_FIELD[breakdown.category];
            if (field) {
                const remaining = breakdown.items.reduce((sum, item) => sum + (item.amount || 0), 0);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (vehicle as any)[field] = remaining;
            }
        }
    }

    vehicle.activityLog.push({ action: "cost_item_deleted", description: "Cost breakdown item removed", date: new Date() });
    await vehicle.save();
    return vehicle;
};

// ── Reports ──────────────────────────────────────────────────────
export const getProfitLossReport = async (vehicleType?: string, dateFrom?: string, dateTo?: string) => {
    const match: Record<string, unknown> = { isActive: true, dateSold: { $ne: null } };
    if (vehicleType) match.vehicleType = vehicleType;
    if (dateFrom || dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (dateFrom) dateFilter.$gte = new Date(dateFrom);
        if (dateTo) dateFilter.$lte = new Date(dateTo);
        match.dateSold = dateFilter;
    }
    return Vehicle.find(match)
        .select("vehicleId vehicleType make model registrationNo datePurchased dateSold purchasePrice totalInvestment soldPrice profitLoss profitLossPercentage daysToSell status fundingSource")
        .sort({ dateSold: -1 })
        .lean();
};

export const getMonthlyReport = async () => {
    return Vehicle.aggregate([
        { $match: { isActive: true } },
        {
            $facet: {
                purchases: [
                    { $group: { _id: { year: { $year: "$datePurchased" }, month: { $month: "$datePurchased" }, type: "$vehicleType" }, count: { $sum: 1 }, totalInvested: { $sum: "$totalInvestment" } } },
                    { $sort: { "_id.year": 1, "_id.month": 1 } },
                ],
                sales: [
                    { $match: { dateSold: { $ne: null } } },
                    { $group: { _id: { year: { $year: "$dateSold" }, month: { $month: "$dateSold" }, type: "$vehicleType" }, count: { $sum: 1 }, totalRevenue: { $sum: "$soldPrice" }, totalProfit: { $sum: "$profitLoss" } } },
                    { $sort: { "_id.year": 1, "_id.month": 1 } },
                ],
            },
        },
    ]);
};

export const getPendingReport = async () => {
    return Vehicle.find({ isActive: true, $or: [{ saleStatus: { $in: ["balance_pending", "noc_pending", "noc_cash_pending"] } }, { purchasePaymentStatus: { $in: ["pending", "partial"] } }] })
        .select("vehicleId vehicleType make model registrationNo purchasedFrom soldTo datePurchased dateSold purchasePrice soldPrice totalInvestment receivedAmount balanceAmount purchasePendingAmount status saleStatus nocStatus purchasePaymentStatus")
        .sort({ dateSold: -1 })
        .lean();
};

export const getInventoryReport = async () => {
    return Vehicle.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: { vehicleType: "$vehicleType", status: "$status" },
                count: { $sum: 1 },
                totalInvested: { $sum: "$totalInvestment" },
            },
        },
        { $sort: { "_id.vehicleType": 1, "_id.status": 1 } },
    ]);
};

// ── Purchase Register ─────────────────────────────────────────────────
interface PurchaseRegisterQuery {
    vehicleType?: string;
    paymentStatus?: string;   // paid | partial | pending | all
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
}

export const getPurchaseRegister = async (query: PurchaseRegisterQuery) => {
    const { vehicleType, paymentStatus, search, dateFrom, dateTo, page = 1, limit = 20 } = query;

    const match: Record<string, unknown> = { isActive: true };
    if (vehicleType) match.vehicleType = vehicleType;
    if (paymentStatus && paymentStatus !== "all") match.purchasePaymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
        const df: Record<string, Date> = {};
        if (dateFrom) df.$gte = new Date(dateFrom);
        if (dateTo) df.$lte = new Date(dateTo);
        match.datePurchased = df;
    }
    if (search) {
        const re = new RegExp(search, "i");
        match.$or = [
            { make: re }, { model: re }, { registrationNo: re },
            { purchasedFrom: re }, { vehicleId: re },
        ];
    }

    const skip = (page - 1) * limit;
    const [data, total, agg] = await Promise.all([
        Vehicle.find(match)
            .select("vehicleId vehicleType make model registrationNo purchasedFrom purchasedFromPhone datePurchased purchasePrice purchasePayments purchasePaymentStatus purchasePendingAmount totalInvestment status fundingSource")
            .sort({ datePurchased: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Vehicle.countDocuments(match),
        Vehicle.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalPurchasePrice: { $sum: "$purchasePrice" },
                    totalPaid: { $sum: { $subtract: ["$purchasePrice", "$purchasePendingAmount"] } },
                    totalPending: { $sum: "$purchasePendingAmount" },
                    pendingCount: {
                        $sum: {
                            $cond: [{ $in: ["$purchasePaymentStatus", ["pending", "partial"]] }, 1, 0],
                        },
                    },
                    fullyPaidCount: {
                        $sum: { $cond: [{ $eq: ["$purchasePaymentStatus", "paid"] }, 1, 0] },
                    },
                },
            },
        ]),
    ]);

    const stats = agg[0] ?? {
        totalPurchasePrice: 0, totalPaid: 0, totalPending: 0, pendingCount: 0, fullyPaidCount: 0,
    };

    return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        stats,
    };
};

// ── Cross-Collection Reg Number Lookup (for Exchange Picker) ──────
export const lookupVehiclesByRegNo = async (q: string) => {
    if (!q || q.trim().length < 2) return [];
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const [vehicles, consignments] = await Promise.all([
        Vehicle.find({ isActive: true, registrationNo: regex })
            .select("vehicleId vehicleType make model registrationNo status color year")
            .limit(8).lean(),
        ConsignmentVehicle.find({ isActive: true, registrationNo: regex })
            .select("consignmentId saleType vehicleType make model registrationNo status color year")
            .limit(8).lean(),
    ]);

    return [
        ...vehicles.map((v) => ({
            _id: v._id.toString(),
            collection: "vehicles" as const,
            refId: v.vehicleId,
            saleType: null as string | null,
            vehicleType: v.vehicleType,
            make: v.make,
            model: v.model,
            registrationNo: v.registrationNo,
            status: v.status,
            color: v.color ?? null,
            year: v.year ?? null,
        })),
        ...consignments.map((c) => ({
            _id: c._id.toString(),
            collection: "consignmentVehicles" as const,
            refId: c.consignmentId,
            saleType: c.saleType as string | null,
            vehicleType: c.vehicleType,
            make: c.make,
            model: c.model,
            registrationNo: c.registrationNo,
            status: c.status,
            color: c.color ?? null,
            year: c.year ?? null,
        })),
    ];
};
