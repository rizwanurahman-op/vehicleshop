import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import investmentService from "../services/investment.service";
import { exportInvestmentsPDF } from "../services/investment_export";
import { apiResponse } from "../utils/api-response";

export const createInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const inv = await investmentService.create(req.body);
        res.status(201).json(apiResponse(201, "Investment recorded successfully", inv));
    } catch (error) { next(error); }
};

export const listInvestments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await investmentService.list(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Investments fetched successfully", data, meta));
    } catch (error) { next(error); }
};

export const getInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const inv = await investmentService.getById(req.params.id as string);
        res.status(200).json(apiResponse(200, "Investment fetched successfully", inv));
    } catch (error) { next(error); }
};

export const updateInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const inv = await investmentService.update(req.params.id as string, req.body);
        res.status(200).json(apiResponse(200, "Investment updated successfully", inv));
    } catch (error) { next(error); }
};

export const deleteInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await investmentService.remove(req.params.id as string);
        res.status(200).json(apiResponse(200, "Investment deleted successfully"));
    } catch (error) { next(error); }
};

export const getInvestmentsByLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await investmentService.getByLender(req.params.lenderId as string, req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Investments by lender fetched", data, meta));
    } catch (error) { next(error); }
};

export const getInvestmentStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { mode, dateFrom, dateTo, lenderId } = req.query as Record<string, string>;
        const stats = await investmentService.getStats({ mode: mode !== "all" ? mode : undefined, dateFrom, dateTo, lenderId });
        res.status(200).json(apiResponse(200, "Investment stats fetched", stats));
    } catch (error) { next(error); }
};

export const exportInvestments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format = "csv", mode, dateFrom, dateTo, search, lenderId } = req.query as Record<string, string>;
        const timestamp = new Date().toISOString().slice(0, 10);
        const data = await investmentService.exportAll({ mode: mode !== "all" ? mode : undefined, dateFrom, dateTo, lenderId, search } as Record<string, string>);

        if (format === "pdf") {
            const buf = await exportInvestmentsPDF(data as never[], { mode, dateFrom, dateTo, search });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="investments_${timestamp}.pdf"`);
            res.status(200).send(buf);
            return;
        }

        const esc = (x: unknown) => { const s = String(x ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const headers = ["Investment ID", "Date", "Lender", "Lender ID", "Amount Received", "Mode", "Reference No", "Notes"];
        const rows = (data as Record<string, unknown>[]).map(inv => [
            inv["Investment ID"], inv["Date"],
            inv["Lender Name"], inv["Lender ID"],
            inv["Amount Received (Rs.)"] ?? inv["amountReceived"],
            inv["Mode"], inv["Reference No"], inv["Notes"],
        ].map(esc).join(","));
        const csv = [headers.map(esc).join(","), ...rows].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="investments_${timestamp}.csv"`);
        res.status(200).send("\uFEFF" + csv);
    } catch (error) { next(error); }
};
