import { Repayment, IRepayment } from "../models/repayment.model";
import { Lender } from "../models/lender.model";
import counterService from "./counter.service";
import { NotFoundError } from "../utils/api-error";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

interface CreateRepaymentInput {
    date: string;
    lender: string;
    amountPaid: number;
    mode: string;
    referenceNo?: string;
    remarks?: string;
}

interface UpdateRepaymentInput {
    date?: string;
    amountPaid?: number;
    mode?: string;
    referenceNo?: string;
    remarks?: string;
}

interface ListRepaymentsQuery {
    page?: string;
    limit?: string;
    lenderId?: string;
    mode?: string;
    dateFrom?: string;
    dateTo?: string;
}

const create = async (data: CreateRepaymentInput): Promise<IRepayment> => {
    const lender = await Lender.findById(data.lender);
    if (!lender) throw new NotFoundError("Lender");

    const repaymentId = await counterService.getNextId("repayment");
    const repayment = await Repayment.create({
        ...data,
        repaymentId,
        date: new Date(data.date),
    });
    return repayment.populate("lender", "lenderId name phone");
};

const list = async (query: ListRepaymentsQuery) => {
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

    const [repayments, total] = await Promise.all([
        Repayment.find(filter)
            .populate("lender", "lenderId name phone")
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Repayment.countDocuments(filter),
    ]);

    return { data: repayments, meta: buildPaginationMeta(total, page, limit) };
};

const getById = async (id: string): Promise<IRepayment> => {
    const rep = await Repayment.findById(id).populate("lender", "lenderId name phone");
    if (!rep) throw new NotFoundError("Repayment");
    return rep;
};

const update = async (id: string, data: UpdateRepaymentInput): Promise<IRepayment> => {
    const rep = await Repayment.findByIdAndUpdate(
        id,
        { ...data, ...(data.date ? { date: new Date(data.date) } : {}) },
        { new: true, runValidators: true }
    ).populate("lender", "lenderId name phone");
    if (!rep) throw new NotFoundError("Repayment");
    return rep;
};

const remove = async (id: string): Promise<void> => {
    const rep = await Repayment.findByIdAndDelete(id);
    if (!rep) throw new NotFoundError("Repayment");
};

const getByLender = async (lenderId: string, query: { page?: string; limit?: string }) => {
    const { page, limit, skip } = getPagination(query);
    const [repayments, total] = await Promise.all([
        Repayment.find({ lender: lenderId }).sort({ date: -1 }).skip(skip).limit(limit).lean(),
        Repayment.countDocuments({ lender: lenderId }),
    ]);
    return { data: repayments, meta: buildPaginationMeta(total, page, limit) };
};

const exportAll = async (query: ListRepaymentsQuery) => {
    const filter: Record<string, unknown> = {};
    if (query.lenderId) filter.lender = query.lenderId;
    if (query.mode) filter.mode = query.mode;

    const repayments = await Repayment.find(filter)
        .populate<{ lender: { lenderId: string; name: string } }>("lender", "lenderId name")
        .sort({ date: -1 })
        .lean();

    return repayments.map(rep => ({
        "Repayment ID": rep.repaymentId,
        Date: new Date(rep.date).toLocaleDateString("en-IN"),
        "Lender ID": rep.lender?.lenderId || "",
        "Lender Name": rep.lender?.name || "",
        "Amount Paid (₹)": rep.amountPaid,
        Mode: rep.mode,
        "Reference No": rep.referenceNo || "",
        Remarks: rep.remarks || "",
    }));
};

const repaymentService = { create, list, getById, update, remove, getByLender, exportAll };
export default repaymentService;
