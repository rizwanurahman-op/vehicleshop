import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import summaryService from "../services/summary.service";
import { exportSummaryPDF } from "../services/summary_export";
import { apiResponse } from "../utils/api-response";

export const getLenderSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await summaryService.getLenderSummary(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Lender summary fetched", data, meta));
    } catch (error) { next(error); }
};

export const getSingleLenderSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const summary = await summaryService.getSingleLenderSummary(req.params.lenderId as string);
        if (!summary) {
            res.status(404).json({ success: false, statusCode: 404, message: "Lender not found" });
            return;
        }
        res.status(200).json(apiResponse(200, "Lender summary fetched", summary));
    } catch (error) { next(error); }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const stats = await summaryService.getDashboardStats();
        res.status(200).json(apiResponse(200, "Dashboard stats fetched", stats));
    } catch (error) { next(error); }
};

export const exportSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format = "csv", status, search, dateFrom, dateTo } = req.query as Record<string, string>;
        const timestamp = new Date().toISOString().slice(0, 10);
        const query = { status, search, dateFrom, dateTo, page: "1", limit: "1000" };

        if (format === "pdf") {
            // PDF needs raw camelCase fields (lenderId, totalBorrowed, etc.)
            const { data } = await summaryService.getLenderSummary(query);
            const buf = await exportSummaryPDF(data as never[], { status, search, dateFrom, dateTo });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="lender-summary_${timestamp}.pdf"`);
            res.status(200).send(buf);
            return;
        }

        // CSV uses renamed display-friendly keys
        const data = await summaryService.exportSummary({ status, search, dateFrom, dateTo });
        const esc = (x: unknown) => { const s = String(x ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const headers = Object.keys(data[0] || {});
        const csv = [
            headers.map(esc).join(","),
            ...data.map((row: Record<string, unknown>) => headers.map(h => esc(row[h])).join(",")),
        ].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="lender-summary_${timestamp}.csv"`);
        res.status(200).send("\uFEFF" + csv);
    } catch (error) { next(error); }
};
