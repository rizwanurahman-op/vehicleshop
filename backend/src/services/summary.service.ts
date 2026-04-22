import { Lender } from "../models/lender.model";
import { Investment } from "../models/investment.model";
import { Repayment } from "../models/repayment.model";

const getLenderSummary = async (query: { page?: string; limit?: string }) => {
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "50", 10)));
    const skip = (page - 1) * limit;

    const pipeline = [
        { $match: {} },
        {
            $lookup: {
                from: "investments",
                localField: "_id",
                foreignField: "lender",
                as: "investments",
            },
        },
        {
            $lookup: {
                from: "repayments",
                localField: "_id",
                foreignField: "lender",
                as: "repayments",
            },
        },
        {
            $project: {
                lenderId: 1,
                name: 1,
                phone: 1,
                isActive: 1,
                totalBorrowed: { $sum: "$investments.amountReceived" },
                totalRepaid: { $sum: "$repayments.amountPaid" },
                balancePayable: {
                    $subtract: [
                        { $sum: "$investments.amountReceived" },
                        { $sum: "$repayments.amountPaid" },
                    ],
                },
                repaymentPercentage: {
                    $cond: [
                        { $gt: [{ $sum: "$investments.amountReceived" }, 0] },
                        {
                            $multiply: [
                                {
                                    $divide: [
                                        { $sum: "$repayments.amountPaid" },
                                        { $sum: "$investments.amountReceived" },
                                    ],
                                },
                                100,
                            ],
                        },
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

    return {
        data: results,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
};

const getSingleLenderSummary = async (lenderId: string) => {
    const lender = await Lender.findById(lenderId).lean();
    if (!lender) return null;

    const [investAgg, repayAgg] = await Promise.all([
        Investment.aggregate([
            { $match: { lender: lender._id } },
            { $group: { _id: null, total: { $sum: "$amountReceived" }, count: { $sum: 1 } } },
        ]),
        Repayment.aggregate([
            { $match: { lender: lender._id } },
            { $group: { _id: null, total: { $sum: "$amountPaid" }, count: { $sum: 1 } } },
        ]),
    ]);

    const totalBorrowed = investAgg[0]?.total ?? 0;
    const totalRepaid = repayAgg[0]?.total ?? 0;
    const balancePayable = totalBorrowed - totalRepaid;

    return {
        ...lender,
        totalBorrowed,
        totalRepaid,
        balancePayable,
        repaymentPercentage: totalBorrowed > 0 ? (totalRepaid / totalBorrowed) * 100 : 0,
        investmentCount: investAgg[0]?.count ?? 0,
        repaymentCount: repayAgg[0]?.count ?? 0,
    };
};

const getDashboardStats = async () => {
    const [
        totalLenders,
        activeLenders,
        investAgg,
        repayAgg,
        recentInvestments,
        recentRepayments,
        monthlyTrend,
        topOutstanding,
    ] = await Promise.all([
        Lender.countDocuments({}),
        Lender.countDocuments({ isActive: true }),
        Investment.aggregate([{ $group: { _id: null, total: { $sum: "$amountReceived" } } }]),
        Repayment.aggregate([{ $group: { _id: null, total: { $sum: "$amountPaid" } } }]),
        Investment.find({})
            .populate("lender", "lenderId name")
            .sort({ date: -1 })
            .limit(5)
            .lean(),
        Repayment.find({})
            .populate("lender", "lenderId name")
            .sort({ date: -1 })
            .limit(5)
            .lean(),
        Investment.aggregate([
            {
                $group: {
                    _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                    totalInvested: { $sum: "$amountReceived" },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 12 },
        ]),
        Lender.aggregate([
            {
                $lookup: {
                    from: "investments",
                    localField: "_id",
                    foreignField: "lender",
                    as: "investments",
                },
            },
            {
                $lookup: {
                    from: "repayments",
                    localField: "_id",
                    foreignField: "lender",
                    as: "repayments",
                },
            },
            {
                $project: {
                    name: 1,
                    lenderId: 1,
                    balance: {
                        $subtract: [
                            { $sum: "$investments.amountReceived" },
                            { $sum: "$repayments.amountPaid" },
                        ],
                    },
                },
            },
            { $match: { balance: { $gt: 0 } } },
            { $sort: { balance: -1 } },
            { $limit: 5 },
        ]),
    ]);

    const totalBorrowed = investAgg[0]?.total ?? 0;
    const totalRepaid = repayAgg[0]?.total ?? 0;

    // Combine recent transactions
    const recentTransactions = [
        ...recentInvestments.map(inv => ({
            date: inv.date,
            type: "investment" as const,
            lenderName: (inv.lender as unknown as { name: string })?.name || "Unknown",
            lenderId: (inv.lender as unknown as { lenderId: string })?.lenderId || "",
            amount: inv.amountReceived,
            mode: inv.mode,
            id: inv._id,
        })),
        ...recentRepayments.map(rep => ({
            date: rep.date,
            type: "repayment" as const,
            lenderName: (rep.lender as unknown as { name: string })?.name || "Unknown",
            lenderId: (rep.lender as unknown as { lenderId: string })?.lenderId || "",
            amount: rep.amountPaid,
            mode: rep.mode,
            id: rep._id,
        })),
    ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

    // Monthly trend with both investments and repayments
    const repayMonthly = await Repayment.aggregate([
        {
            $group: {
                _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                totalRepaid: { $sum: "$amountPaid" },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
        { $limit: 12 },
    ]);

    const repayMap = new Map(
        repayMonthly.map(r => [`${r._id.year}-${r._id.month}`, r.totalRepaid])
    );

    const trendData = monthlyTrend.map(m => ({
        year: m._id.year,
        month: m._id.month,
        totalInvested: m.totalInvested,
        totalRepaid: repayMap.get(`${m._id.year}-${m._id.month}`) ?? 0,
    }));

    return {
        totalLenders,
        activeLenders,
        totalBorrowed,
        totalRepaid,
        totalOutstanding: totalBorrowed - totalRepaid,
        recentTransactions,
        monthlyTrend: trendData,
        topOutstanding,
    };
};

const exportSummary = async () => {
    const pipeline = [
        {
            $lookup: {
                from: "investments",
                localField: "_id",
                foreignField: "lender",
                as: "investments",
            },
        },
        {
            $lookup: {
                from: "repayments",
                localField: "_id",
                foreignField: "lender",
                as: "repayments",
            },
        },
        {
            $project: {
                lenderId: 1,
                name: 1,
                phone: 1,
                isActive: 1,
                totalBorrowed: { $sum: "$investments.amountReceived" },
                totalRepaid: { $sum: "$repayments.amountPaid" },
                balancePayable: {
                    $subtract: [
                        { $sum: "$investments.amountReceived" },
                        { $sum: "$repayments.amountPaid" },
                    ],
                },
            },
        },
        { $sort: { balancePayable: -1 as const } },
    ];

    const results = await Lender.aggregate(pipeline);
    return results.map(r => ({
        "Lender ID": r.lenderId,
        Name: r.name,
        Phone: r.phone || "",
        "Total Borrowed (₹)": r.totalBorrowed,
        "Total Repaid (₹)": r.totalRepaid,
        "Balance Payable (₹)": r.balancePayable,
        Status: r.isActive ? "Active" : "Inactive",
    }));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const summaryService: Record<string, (...args: any[]) => any> = { getLenderSummary, getSingleLenderSummary, getDashboardStats, exportSummary };
export default summaryService;
