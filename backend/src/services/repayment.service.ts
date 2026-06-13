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
    repaymentType?: string;
    referenceNo?: string;
    remarks?: string;
}

interface UpdateRepaymentInput {
    date?: string;
    amountPaid?: number;
    mode?: string;
    repaymentType?: string;
    referenceNo?: string;
    remarks?: string;
}

interface ListRepaymentsQuery {
    page?: string;
    limit?: string;
    lenderId?: string;
    mode?: string;
    repaymentType?: string;
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
    if (query.repaymentType) filter.repaymentType = query.repaymentType;
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

const exportAll = async (query: { lenderId?: string; mode?: string; repaymentType?: string; dateFrom?: string; dateTo?: string; search?: string } = {}) => {
    const filter: Record<string, unknown> = {};
    if (query.lenderId)      filter.lender        = query.lenderId;
    if (query.mode)          filter.mode          = query.mode;
    if (query.repaymentType) filter.repaymentType = query.repaymentType;
    if (query.dateFrom || query.dateTo) {
        const df: Record<string, Date> = {};
        if (query.dateFrom) df.$gte = new Date(query.dateFrom);
        if (query.dateTo)   df.$lte = new Date(new Date(query.dateTo).setHours(23, 59, 59, 999));
        filter.date = df;
    }

    const repayments = await Repayment.find(filter)
        .populate<{ lender: { lenderId: string; name: string } }>("lender", "lenderId name")
        .sort({ date: -1 })
        .lean();

    const searchLower = query.search?.toLowerCase();
    const filtered = searchLower
        ? repayments.filter(r =>
            r.repaymentId?.toLowerCase().includes(searchLower) ||
            r.lender?.name?.toLowerCase().includes(searchLower) ||
            r.lender?.lenderId?.toLowerCase().includes(searchLower)
          )
        : repayments;

    return filtered.map(rep => ({
        repaymentId:   rep.repaymentId,
        date:          rep.date,
        lender:        rep.lender,
        amountPaid:    rep.amountPaid,
        mode:          rep.mode,
        repaymentType: rep.repaymentType ?? "Principal",
        referenceNo:   rep.referenceNo || "",
        remarks:       rep.remarks || "",
        // CSV-friendly aliases
        "Repayment ID":      rep.repaymentId,
        "Date":              new Date(rep.date).toLocaleDateString("en-IN"),
        "Lender ID":         rep.lender?.lenderId || "",
        "Lender Name":       rep.lender?.name || "",
        "Type":              rep.repaymentType ?? "Principal",
        "Amount Paid (Rs.)": rep.amountPaid,
        "Mode":              rep.mode,
        "Reference No":      rep.referenceNo || "",
        "Remarks":           rep.remarks || "",
    }));
};

const getStats = async (query: { lenderId?: string; mode?: string; repaymentType?: string; dateFrom?: string; dateTo?: string } = {}) => {
    const data = await exportAll(query);
    const totalPaid      = data.reduce((s, r) => s + r.amountPaid, 0);
    const totalPrincipal = data.filter(r => r.repaymentType === "Principal").reduce((s, r) => s + r.amountPaid, 0);
    const totalProfit    = data.filter(r => r.repaymentType === "Profit").reduce((s, r) => s + r.amountPaid, 0);
    const avgAmount = data.length > 0 ? Math.round(totalPaid / data.length) : 0;
    const modeMap = new Map<string, number>();
    data.forEach(r => modeMap.set(r.mode, (modeMap.get(r.mode) ?? 0) + r.amountPaid));
    const byMode = Object.fromEntries(modeMap);
    const uniqueLenders = new Set(data.map(r => typeof r.lender === "object" ? (r.lender as {name?:string})?.name : r.lender)).size;
    return { totalRepayments: data.length, totalPaid, totalPrincipal, totalProfit, avgAmount, byMode, uniqueLenders };
};

const repaymentService = { create, list, getById, update, remove, getByLender, exportAll, getStats };
export default repaymentService;
