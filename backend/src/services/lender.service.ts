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

const exportAll = async () => {
    const lenders = await Lender.find({}).lean();
    const lenderIds = lenders.map(l => l._id);

    const [investAggs, repayAggs] = await Promise.all([
        Investment.aggregate([
            { $match: { lender: { $in: lenderIds } } },
            { $group: { _id: "$lender", totalBorrowed: { $sum: "$amountReceived" } } },
        ]),
        Repayment.aggregate([
            { $match: { lender: { $in: lenderIds } } },
            { $group: { _id: "$lender", totalRepaid: { $sum: "$amountPaid" } } },
        ]),
    ]);

    const investMap = new Map(investAggs.map(a => [a._id.toString(), a.totalBorrowed]));
    const repayMap = new Map(repayAggs.map(a => [a._id.toString(), a.totalRepaid]));

    return lenders.map(l => {
        const totalBorrowed = investMap.get(l._id.toString()) ?? 0;
        const totalRepaid = repayMap.get(l._id.toString()) ?? 0;
        return {
            "Lender ID": l.lenderId,
            Name: l.name,
            Phone: l.phone || "",
            Address: l.address || "",
            Remarks: l.remarks || "",
            "Total Borrowed (₹)": totalBorrowed,
            "Total Repaid (₹)": totalRepaid,
            "Balance Payable (₹)": totalBorrowed - totalRepaid,
            Status: l.isActive ? "Active" : "Inactive",
        };
    });
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const lenderService: Record<string, (...args: any[]) => any> = { create, list, getById, update, softDelete, exportAll };
export default lenderService;
