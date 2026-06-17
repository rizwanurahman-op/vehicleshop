import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import repaymentService from "../services/repayment.service";
import { exportRepaymentsPDF } from "../services/repayment_export";
import { apiResponse } from "../utils/api-response";

export const createRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rep = await repaymentService.create(req.body);
        res.status(201).json(apiResponse(201, "Repayment recorded successfully", rep));
    } catch (error) { next(error); }
};

export const listRepayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await repaymentService.list(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Repayments fetched successfully", data, meta));
    } catch (error) { next(error); }
};

export const getRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rep = await repaymentService.getById(req.params.id as string);
        res.status(200).json(apiResponse(200, "Repayment fetched successfully", rep));
    } catch (error) { next(error); }
};

export const updateRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rep = await repaymentService.update(req.params.id as string, req.body);
        res.status(200).json(apiResponse(200, "Repayment updated successfully", rep));
    } catch (error) { next(error); }
};

export const deleteRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await repaymentService.remove(req.params.id as string);
        res.status(200).json(apiResponse(200, "Repayment deleted successfully"));
    } catch (error) { next(error); }
};

export const getRepaymentsByLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await repaymentService.getByLender(req.params.lenderId as string, req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Repayments by lender fetched", data, meta));
    } catch (error) { next(error); }
};

export const getRepaymentStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { mode, dateFrom, dateTo, lenderId, repaymentType, search } = req.query as Record<string, string>;
        const stats = await repaymentService.getStats({ mode: mode !== "all" ? mode : undefined, dateFrom, dateTo, lenderId, repaymentType: repaymentType !== "all" ? repaymentType : undefined, search });
        res.status(200).json(apiResponse(200, "Repayment stats fetched", stats));
    } catch (error) { next(error); }
};

export const exportRepayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format = "csv", mode, dateFrom, dateTo, lenderId, search } = req.query as Record<string, string>;
        const timestamp = new Date().toISOString().slice(0, 10);
        const data = await repaymentService.exportAll({ mode: mode !== "all" ? mode : undefined, dateFrom, dateTo, lenderId, search });

        if (format === "pdf") {
            const buf = await exportRepaymentsPDF(data as never[], { mode, dateFrom, dateTo, search });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="repayments_${timestamp}.pdf"`);
            res.status(200).send(buf);
            return;
        }

        const esc = (x: unknown) => { const s = String(x ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const headers = ["Repayment ID", "Date", "Type", "Lender", "Lender ID", "Amount Paid", "Mode", "Reference No", "Remarks"];
        const rows = (data as Record<string, unknown>[]).map(r => [
            r["Repayment ID"], r["Date"],
            r["Type"] ?? r["repaymentType"] ?? "Principal",
            r["Lender Name"], r["Lender ID"],
            r["Amount Paid (Rs.)"] ?? r["amountPaid"],
            r["Mode"], r["Reference No"], r["Remarks"],
        ].map(esc).join(","));
        const csv = [headers.map(esc).join(","), ...rows].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="repayments_${timestamp}.csv"`);
        res.status(200).send("\uFEFF" + csv);
    } catch (error) { next(error); }
};
