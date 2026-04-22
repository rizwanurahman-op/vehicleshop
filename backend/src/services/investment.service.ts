import { Investment, IInvestment } from "../models/investment.model";
import { Lender } from "../models/lender.model";
import counterService from "./counter.service";
import { NotFoundError } from "../utils/api-error";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

interface CreateInvestmentInput {
    date: string;
    lender: string;
    amountReceived: number;
    mode: string;
    referenceNo?: string;
    notes?: string;
}

interface UpdateInvestmentInput {
    date?: string;
    amountReceived?: number;
    mode?: string;
    referenceNo?: string;
    notes?: string;
}

interface ListInvestmentsQuery {
    page?: string;
    limit?: string;
    lenderId?: string;
    mode?: string;
    dateFrom?: string;
    dateTo?: string;
}

const create = async (data: CreateInvestmentInput): Promise<IInvestment> => {
    const lender = await Lender.findById(data.lender);
    if (!lender) throw new NotFoundError("Lender");

    const investmentId = await counterService.getNextId("investment");
    const investment = await Investment.create({
        ...data,
        investmentId,
        date: new Date(data.date),
    });
    return investment.populate("lender", "lenderId name phone");
};

const list = async (query: ListInvestmentsQuery) => {
    const { page, limit, skip } = getPagination(query);
    const filter: Record<string, unknown> = {};

    if (query.lenderId) filter.lender = query.lenderId;
    if (query.mode) filter.mode = query.mode;
    if (query.dateFrom || query.dateTo) {
        const dateFilter: Record<string, Date> = {};
        if (query.dateFrom) dateFilter.$gte = new Date(query.dateFrom);
        if (query.dateTo) dateFilter.$lte = new Date(query.dateTo);
        filter.date = dateFilter;
    }

    const [investments, total] = await Promise.all([
        Investment.find(filter)
            .populate("lender", "lenderId name phone")
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Investment.countDocuments(filter),
    ]);

    return { data: investments, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (id: string): Promise<IInvestment> => {
    const inv = await Investment.findById(id).populate("lender", "lenderId name phone");
    if (!inv) throw new NotFoundError("Investment");
    return inv;
};

const update = async (id: string, data: UpdateInvestmentInput): Promise<IInvestment> => {
    const inv = await Investment.findByIdAndUpdate(
        id,
        { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
        { new: true, runValidators: true }
    ).populate("lender", "lenderId name phone");
    if (!inv) throw new NotFoundError("Investment");
    return inv;
};

const remove = async (id: string): Promise<void> => {
    const inv = await Investment.findByIdAndDelete(id);
    if (!inv) throw new NotFoundError("Investment");
};

const getByLender = async (lenderId: string, query: { page?: string; limit?: string }) => {
    const { page, limit, skip } = getPagination(query);
    const [investments, total] = await Promise.all([
        Investment.find({ lender: lenderId }).sort({ date: -1 }).skip(skip).limit(limit).lean(),
        Investment.countDocuments({ lender: lenderId }),
    ]);
    return { data: investments, meta: buildPaginationMeta(total, page, limit) };
};

const exportAll = async (query: ListInvestmentsQuery) => {
    const filter: Record<string, unknown> = {};
    if (query.lenderId) filter.lender = query.lenderId;
    if (query.mode) filter.mode = query.mode;

    const investments = await Investment.find(filter)
        .populate<{ lender: { lenderId: string; name: string } }>("lender", "lenderId name")
        .sort({ date: -1 })
        .lean();

    return investments.map(inv => ({
        "Investment ID": inv.investmentId,
        Date: new Date(inv.date).toLocaleDateString("en-IN"),
        "Lender ID": inv.lender?.lenderId || "",
        "Lender Name": inv.lender?.name || "",
        "Amount Received (₹)": inv.amountReceived,
        Mode: inv.mode,
        "Reference No": inv.referenceNo || "",
        Notes: inv.notes || "",
    }));
};

const investmentService = { create, list, getById, update, remove, getByLender, exportAll };
export default investmentService;
