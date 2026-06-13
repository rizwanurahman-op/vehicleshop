import { Lender } from "../models/lender.model";
import { Investment } from "../models/investment.model";
import { Repayment } from "../models/repayment.model";
import { Vehicle } from "../models/vehicle.model";
import { ConsignmentVehicle } from "../models/consignment-vehicle.model";

// ── helpers ────────────────────────────────────────────────────────────────────
interface SummaryQuery {
    page?: string;
    limit?: string;
    search?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}

const buildDateFilter = (dateFrom?: string, dateTo?: string): Record<string, Date> | null => {
    if (!dateFrom && !dateTo) return null;
    const df: Record<string, Date> = {};
    if (dateFrom) df.$gte = new Date(dateFrom);
    if (dateTo)   df.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    return df;
};

// ── getLenderSummary ───────────────────────────────────────────────────────────
const getLenderSummary = async (query: SummaryQuery) => {
    const page  = Math.max(1, parseInt(query.page  || "1",   10));
    const limit = Math.min(200, Math.max(1, parseInt(query.limit || "100", 10)));
    const skip  = (page - 1) * limit;

    const lenderMatch: Record<string, unknown> = {};
    if (query.status === "active")        lenderMatch.isActive = true;
    else if (query.status === "inactive") lenderMatch.isActive = false;
    if (query.search) {
        lenderMatch.$or = [
            { name:     { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone:    { $regex: query.search, $options: "i" } },
        ];
    }

    const dateFilter = buildDateFilter(query.dateFrom, query.dateTo);

    const investLookup = dateFilter
        ? { from: "investments", let: { lid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$lender", "$$lid"] }, date: dateFilter } }], as: "investments" }
        : { from: "investments", localField: "_id", foreignField: "lender", as: "investments" };

    // Separate lookups for Principal vs Profit repayments
    const principalLookup = dateFilter
        ? { from: "repayments", let: { lid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$lender", "$$lid"] }, date: dateFilter, repaymentType: { $in: ["Principal", null] } } }], as: "principalRepayments" }
        : { from: "repayments", let: { lid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$lender", "$$lid"] }, repaymentType: { $in: ["Principal", null] } } }], as: "principalRepayments" };

    const profitLookup = dateFilter
        ? { from: "repayments", let: { lid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$lender", "$$lid"] }, date: dateFilter, repaymentType: "Profit" } }], as: "profitRepayments" }
        : { from: "repayments", let: { lid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$lender", "$$lid"] }, repaymentType: "Profit" } }], as: "profitRepayments" };

    const pipeline = [
        { $match: lenderMatch },
        { $lookup: investLookup },
        { $lookup: principalLookup },
        { $lookup: profitLookup },
        {
            $project: {
                lenderId: 1, name: 1, phone: 1, isActive: 1,
                totalBorrowed:  { $sum: "$investments.amountReceived" },
                totalRepaid:    { $sum: "$principalRepayments.amountPaid" },
                totalProfit:    { $sum: "$profitRepayments.amountPaid" },
                balancePayable: { $subtract: [{ $sum: "$investments.amountReceived" }, { $sum: "$principalRepayments.amountPaid" }] },
                repaymentPercentage: {
                    $cond: [
                        { $gt: [{ $sum: "$investments.amountReceived" }, 0] },
                        { $multiply: [{ $divide: [{ $sum: "$principalRepayments.amountPaid" }, { $sum: "$investments.amountReceived" }] }, 100] },
                        0,
                    ],
                },
            },
        },
        { $sort: { balancePayable: -1 as const } },
    ];

    const [results, countResult] = await Promise.all([
        Lender.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
        Lender.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const total = countResult[0]?.total ?? 0;
    return { data: results, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

// ── getSingleLenderSummary ─────────────────────────────────────────────────────
const getSingleLenderSummary = async (lenderId: string) => {
    const lender = await Lender.findById(lenderId).lean();
    if (!lender) return null;

    const [investAgg, principalAgg, profitAgg] = await Promise.all([
        Investment.aggregate([
            { $match: { lender: lender._id } },
            { $group: { _id: null, total: { $sum: "$amountReceived" }, count: { $sum: 1 } } },
        ]),
        Repayment.aggregate([
            { $match: { lender: lender._id, repaymentType: { $in: ["Principal", null] } } },
            { $group: { _id: null, total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
        ]),
        Repayment.aggregate([
            { $match: { lender: lender._id, repaymentType: "Profit" } },
            { $group: { _id: null, total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
        ]),
    ]);

    const totalBorrowed  = investAgg[0]?.total    ?? 0;
    const totalRepaid    = principalAgg[0]?.total  ?? 0;
    const totalProfit    = profitAgg[0]?.total     ?? 0;
    const balancePayable = totalBorrowed - totalRepaid;

    return {
        ...lender, totalBorrowed, totalRepaid, totalProfit, balancePayable,
        repaymentPercentage: totalBorrowed > 0 ? (totalRepaid / totalBorrowed) * 100 : 0,
        investmentCount: investAgg[0]?.count    ?? 0,
        repaymentCount:  principalAgg[0]?.count ?? 0,
        profitCount:     profitAgg[0]?.count    ?? 0,
    };
};

// ── getDashboardStats ───────────────────────────────────────────────────────────────────────────────
const getDashboardStats = async () => {
    const [
        totalLenders, activeLenders, investAgg, principalAgg, profitAgg,
        recentInvestments, recentRepayments, monthlyTrend, topOutstanding,
    ] = await Promise.all([
        Lender.countDocuments({}),
        Lender.countDocuments({ isActive: true }),
        Investment.aggregate([{ $group: { _id: null, total: { $sum: "$amountReceived" } } }]),
        Repayment.aggregate([{ $match: { repaymentType: { $in: ["Principal", null] } } }, { $group: { _id: null, total: { $sum: "$amountPaid" } } }]),
        Repayment.aggregate([{ $match: { repaymentType: "Profit" } }, { $group: { _id: null, total: { $sum: "$amountPaid" } } }]),
        Investment.find({}).populate("lender", "lenderId name").sort({ date: -1 }).limit(5).lean(),
        Repayment.find({}).populate("lender",  "lenderId name").sort({ date: -1 }).limit(5).lean(),
        Investment.aggregate([
            { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, totalInvested: { $sum: "$amountReceived" } } },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 },
        ]),
        Lender.aggregate([
            { $lookup: { from: "investments", localField: "_id", foreignField: "lender", as: "investments" } },
            { $lookup: { from: "repayments", let: { lid: "$_id" }, pipeline: [{ $match: { $expr: { $eq: ["$lender", "$$lid"] }, repaymentType: { $in: ["Principal", null] } } }], as: "principalRepayments" } },
            { $project: { name: 1, lenderId: 1, balance: { $subtract: [{ $sum: "$investments.amountReceived" }, { $sum: "$principalRepayments.amountPaid" }] } } },
            { $match: { balance: { $gt: 0 } } },
            { $sort: { balance: -1 } },
            { $limit: 5 },
        ]),
    ]);

    const totalBorrowed = investAgg[0]?.total    ?? 0;
    const totalRepaid   = principalAgg[0]?.total  ?? 0;  // Principal only
    const totalProfit   = profitAgg[0]?.total     ?? 0;  // Profit only

    const recentTransactions = [
        ...recentInvestments.map(inv => ({
            date: inv.date, type: "investment" as const,
            lenderName: (inv.lender as unknown as { name: string })?.name || "Unknown",
            lenderId:   (inv.lender as unknown as { lenderId: string })?.lenderId || "",
            amount: inv.amountReceived, mode: inv.mode, id: inv._id,
            repaymentType: undefined as string | undefined,
        })),
        ...recentRepayments.map(rep => ({
            date: rep.date, type: "repayment" as const,
            lenderName: (rep.lender as unknown as { name: string })?.name || "Unknown",
            lenderId:   (rep.lender as unknown as { lenderId: string })?.lenderId || "",
            amount: rep.amountPaid, mode: rep.mode, id: rep._id,
            repaymentType: (rep as unknown as { repaymentType?: string }).repaymentType ?? "Principal",
        })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    const [principalMonthly, profitMonthly] = await Promise.all([
        Repayment.aggregate([{ $match: { repaymentType: { $in: ["Principal", null] } } }, { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, totalPrincipal: { $sum: "$amountPaid" } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }, { $limit: 12 }]),
        Repayment.aggregate([{ $match: { repaymentType: "Profit" } }, { $group: { _id: { year: { $year: "$date" }, month: { $month: "$date" } }, totalProfit: { $sum: "$amountPaid" } } }, { $sort: { "_id.year": 1, "_id.month": 1 } }, { $limit: 12 }]),
    ]);

    const principalMap = new Map(principalMonthly.map(r => [`${r._id.year}-${r._id.month}`, r.totalPrincipal]));
    const profitMap    = new Map(profitMonthly.map(r    => [`${r._id.year}-${r._id.month}`, r.totalProfit]));

    const trendData = monthlyTrend.map(m => ({
        year: m._id.year, month: m._id.month,
        totalInvested: m.totalInvested,
        totalRepaid:   principalMap.get(`${m._id.year}-${m._id.month}`) ?? 0,
        totalProfit:   profitMap.get(`${m._id.year}-${m._id.month}`)    ?? 0,
    }));

    // ── Vehicle stats ────────────────────────────────────────────────────────
    const [vehicleAgg, consignmentAgg] = await Promise.all([
        Vehicle.aggregate([
            { $match: { isActive: true } },
            { $group: {
                _id: null,
                total:         { $sum: 1 },
                inStock:       { $sum: { $cond: [{ $in: ["$status", ["in_stock", "reconditioning", "ready_for_sale"]] }, 1, 0] } },
                sold:          { $sum: { $cond: [{ $eq: ["$status", "sold"] }, 1, 0] } },
                soldPending:   { $sum: { $cond: [{ $eq: ["$status", "sold_pending"] }, 1, 0] } },
                exchanged:     { $sum: { $cond: [{ $eq: ["$status", "exchanged"] }, 1, 0] } },
                totalRevenue:  { $sum: { $cond: [{ $in: ["$status", ["sold", "sold_pending"]] }, "$soldPrice", 0] } },
                totalInvested: { $sum: "$totalInvestment" },
                netProfit:     { $sum: { $cond: [{ $in: ["$status", ["sold", "sold_pending"]] }, "$profitLoss", 0] } },
                balancePending:{ $sum: { $cond: [{ $eq: ["$saleStatus", "balance_pending"] }, 1, 0] } },
                balancePendingAmt: { $sum: "$balanceAmount" },
            }}
        ]),
        ConsignmentVehicle.aggregate([
            { $match: { isActive: true } },
            { $group: {
                _id: null,
                total:      { $sum: 1 },
                active:     { $sum: { $cond: [{ $in: ["$status", ["received", "reconditioning", "ready_for_sale"]] }, 1, 0] } },
                sold:       { $sum: { $cond: [{ $in: ["$status", ["sold", "sold_pending"]] }, 1, 0] } },
                parkSale:   { $sum: { $cond: [{ $eq: ["$saleType", "park_sale"] }, 1, 0] } },
                financeSale:{ $sum: { $cond: [{ $eq: ["$saleType", "finance_sale"] }, 1, 0] } },
                netProfit:  { $sum: { $cond: [{ $in: ["$status", ["sold", "sold_pending"]] }, "$netProfit", 0] } },
                totalRevenue:{ $sum: { $cond: [{ $in: ["$status", ["sold", "sold_pending"]] }, "$soldPrice", 0] } },
            }}
        ]),
    ]);

    const veh = vehicleAgg[0] ?? {};
    const con = consignmentAgg[0] ?? {};

    const vehicleStats = {
        total:          veh.total         ?? 0,
        inStock:        veh.inStock       ?? 0,
        sold:           veh.sold          ?? 0,
        soldPending:    veh.soldPending   ?? 0,
        exchanged:      veh.exchanged     ?? 0,
        totalRevenue:   veh.totalRevenue  ?? 0,
        totalInvested:  veh.totalInvested ?? 0,
        netProfit:      veh.netProfit     ?? 0,
        balancePending: veh.balancePending ?? 0,
        balancePendingAmt: veh.balancePendingAmt ?? 0,
    };

    const consignmentStats = {
        total:       con.total       ?? 0,
        active:      con.active      ?? 0,
        sold:        con.sold        ?? 0,
        parkSale:    con.parkSale    ?? 0,
        financeSale: con.financeSale ?? 0,
        netProfit:   con.netProfit   ?? 0,
        totalRevenue: con.totalRevenue ?? 0,
    };

    return {
        totalLenders, activeLenders,
        totalBorrowed, totalRepaid, totalProfit,
        totalOutstanding: totalBorrowed - totalRepaid,
        recentTransactions, monthlyTrend: trendData, topOutstanding,
        vehicleStats, consignmentStats,
    };
};

// ── exportSummary ──────────────────────────────────────────────────────────────
const exportSummary = async (query: Omit<SummaryQuery, "page" | "limit"> = {}) => {
    const { data } = await getLenderSummary({ ...query, page: "1", limit: "1000" });
    return (data as Record<string, unknown>[]).map(r => ({
        "Lender ID":       r.lenderId,
        "Name":            r.name,
        "Phone":           r.phone || "",
        "Total Borrowed":  r.totalBorrowed,
        "Principal Repaid": r.totalRepaid,
        "Profit Paid":     r.totalProfit ?? 0,
        "Balance Payable": r.balancePayable,
        "Repayment %":     typeof r.repaymentPercentage === "number" ? (r.repaymentPercentage as number).toFixed(1) : "0.0",
        "Status":          r.isActive ? "Active" : "Inactive",
    }));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summaryService: Record<string, (...args: any[]) => any> = { getLenderSummary, getSingleLenderSummary, getDashboardStats, exportSummary };
export default summaryService;
