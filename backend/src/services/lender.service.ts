import { Lender, ILender } from "../models/lender.model";
import { Investment } from "../models/investment.model";
import { Repayment } from "../models/repayment.model";
import counterService from "./counter.service";
import { NotFoundError } from "../utils/api-error";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

interface CreateLenderInput {
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
}

interface UpdateLenderInput {
    name?: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive?: boolean;
}

interface ListLendersQuery {
    page?: string;
    limit?: string;
    search?: string;
    status?: "active" | "inactive" | "all";
}

const create = async (data: CreateLenderInput): Promise<ILender> => {
    const lenderId = await counterService.getNextId("lender");
    return await Lender.create({ ...data, lenderId });
};

const list = async (query: ListLendersQuery) => {
    const { page, limit, skip } = getPagination(query);
    const filter: Record<string, unknown> = {};

    if (query.status === "active") filter.isActive = true;
    else if (query.status === "inactive") filter.isActive = false;
    else filter.isActive = { $ne: false }; // default: active only... unless all

    if (query.status === "all") delete filter.isActive;

    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
        ];
    }

    const [lenders, total] = await Promise.all([
        Lender.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Lender.countDocuments(filter),
    ]);

    // Attach aggregated summary data
    const lenderIds = lenders.map(l => l._id);
    const [investmentAggs, repaymentAggs] = await Promise.all([
        Investment.aggregate([
            { $match: { lender: { $in: lenderIds } } },
            { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: { lender: { $in: lenderIds } } },
            { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const investMap = new Map(investmentAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap = new Map(repaymentAggs.map(a => [a._id.toString(), a.totalRepaid]));

    const enriched = lenders.map(l => {
        const totalBorrowed = investMap.get(l._id.toString()) ?? 0;
        const totalRepaid = repayMap.get(l._id.toString()) ?? 0;
        return { ...l, totalBorrowed, totalRepaid, balancePayable: totalBorrowed - totalRepaid };
    });

    return { data: enriched, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (id: string) => {
    const lender = await Lender.findById(id).lean();
    if (!lender) throw new NotFoundError("Lender");

    const [investAgg, repayAgg] = await Promise.all([
        Investment.aggregate([
            { $match: { lender: lender._id } },
            { $group: { _id: null, totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: { lender: lender._id } },
            { $group: { _id: null, totalRepaid: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const totalBorrowed = investAgg[0]?.totalBorrowed ?? 0;
    const totalRepaid = repayAgg[0]?.totalRepaid ?? 0;

    return { ...lender, totalBorrowed, totalRepaid, balancePayable: totalBorrowed - totalRepaid };
};

const update = async (id: string, data: UpdateLenderInput): Promise<ILender> => {
    const lender = await Lender.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!lender) throw new NotFoundError("Lender");
    return lender;
};

const softDelete = async (id: string): Promise<ILender> => {
    const lender = await Lender.findByIdAndUpdate(id, { isActive: false }, { new: true });
    if (!lender) throw new NotFoundError("Lender");
    return lender;
};

const restore = async (id: string): Promise<ILender> => {
    const lender = await Lender.findByIdAndUpdate(id, { isActive: true }, { new: true });
    if (!lender) throw new NotFoundError("Lender");
    return lender;
};

const hardDelete = async (id: string): Promise<void> => {
    const lender = await Lender.findById(id);
    if (!lender) throw new NotFoundError("Lender");
    await Lender.findByIdAndDelete(id);
};

const exportAll = async (query: { status?: string; search?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const filter: Record<string, unknown> = {};
    if (query.status === "active")        filter.isActive = true;
    else if (query.status === "inactive") filter.isActive = false;
    // if status === "all" or undefined, no filter

    if (query.search) {
        filter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
        ];
    }

    // Build optional date filter for investment/repayment transactions
    const txDateFilter: Record<string, Date> = {};
    if (query.dateFrom) txDateFilter.$gte = new Date(query.dateFrom);
    if (query.dateTo)   txDateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));
    const hasDateFilter = Object.keys(txDateFilter).length > 0;

    const lenders = await Lender.find(filter).sort({ createdAt: -1 }).lean();
    const lenderIds = lenders.map(l => l._id);

    const investMatch: Record<string, unknown> = { lender: { $in: lenderIds } };
    const repayMatch:  Record<string, unknown> = { lender: { $in: lenderIds } };
    if (hasDateFilter) { investMatch.date = txDateFilter; repayMatch.date = txDateFilter; }

    const [investAggs, repayAggs] = await Promise.all([
        Investment.aggregate([
            { $match: investMatch },
            { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: repayMatch },
            { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const investMap = new Map(investAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap  = new Map(repayAggs.map(a  => [a._id.toString(), a.totalRepaid]));

    return lenders.map(l => {
        const totalBorrowed  = investMap.get(l._id.toString()) ?? 0;
        const totalRepaid    = repayMap.get(l._id.toString())  ?? 0;
        const balancePayable = totalBorrowed - totalRepaid;
        return {
            lenderId: l.lenderId,
            name:  l.name,
            phone: l.phone || "",
            address: l.address || "",
            remarks: l.remarks || "",
            totalBorrowed,
            totalRepaid,
            balancePayable,
            isActive: l.isActive,
            // CSV-friendly aliases
            "Lender ID": l.lenderId,
            "Name": l.name,
            "Phone": l.phone || "",
            "Address": l.address || "",
            "Remarks": l.remarks || "",
            "Total Borrowed (Rs.)": totalBorrowed,
            "Total Repaid (Rs.)": totalRepaid,
            "Balance Payable (Rs.)": balancePayable,
            "Status": l.isActive !== false ? "Active" : "Inactive",
        };
    });
};

const getStats = async (query: { status?: string; search?: string; dateFrom?: string; dateTo?: string } = {}) => {
    // Build lender filter (same as exportAll)
    const lenderFilter: Record<string, unknown> = {};
    if (query.status === "active")       lenderFilter.isActive = true;
    else if (query.status === "inactive") lenderFilter.isActive = false;
    if (query.search) {
        lenderFilter.$or = [
            { name: { $regex: query.search, $options: "i" } },
            { lenderId: { $regex: query.search, $options: "i" } },
            { phone: { $regex: query.search, $options: "i" } },
        ];
    }

    // Build date filter for investment/repayment transactions
    const txDateFilter: Record<string, Date> = {};
    if (query.dateFrom) txDateFilter.$gte = new Date(query.dateFrom);
    if (query.dateTo)   txDateFilter.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));

    const lenders = await Lender.find(lenderFilter).lean();
    const lenderIds = lenders.map(l => l._id);

    const investMatch: Record<string, unknown> = { lender: { $in: lenderIds } };
    const repayMatch:  Record<string, unknown> = { lender: { $in: lenderIds } };
    if (Object.keys(txDateFilter).length) {
        investMatch.date = txDateFilter;
        repayMatch.date  = txDateFilter;
    }

    const [investAggs, repayAggs] = await Promise.all([
        Investment.aggregate([
            { $match: investMatch },
            { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: repayMatch },
            { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const investMap = new Map(investAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap  = new Map(repayAggs.map(a  => [a._id.toString(), a.totalRepaid]));

    const enriched = lenders.map(l => ({
        ...l,
        totalBorrowed:  investMap.get(l._id.toString()) ?? 0,
        totalRepaid:    repayMap.get(l._id.toString())  ?? 0,
        balancePayable: (investMap.get(l._id.toString()) ?? 0) - (repayMap.get(l._id.toString()) ?? 0),
    }));

    const totalBorrowed  = enriched.reduce((s, l) => s + l.totalBorrowed,  0);
    const totalRepaid    = enriched.reduce((s, l) => s + l.totalRepaid,    0);
    const balancePayable = enriched.reduce((s, l) => s + l.balancePayable, 0);
    const activeCount    = lenders.filter(l => l.isActive !== false).length;
    const inactiveCount  = lenders.length - activeCount;
    const paidOffCount   = enriched.filter(l => l.balancePayable <= 0).length;
    return { totalLenders: lenders.length, totalBorrowed, totalRepaid, balancePayable, activeCount, inactiveCount, paidOffCount };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lenderService: Record<string, (...args: any[]) => any> = { create, list, getById, update, softDelete, restore, hardDelete, exportAll, getStats };
export default lenderService;
