import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import summaryService from "../services/summary.service";
import { apiResponse } from "../utils/api-response";

export const getLenderSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await summaryService.getLenderSummary(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Lender summary fetched", data, meta));
    } catch (error) {
        next(error);
    }
};

export const getSingleLenderSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const summary = await summaryService.getSingleLenderSummary(req.params.lenderId as string);
        if (!summary) {
            res.status(404).json({ success: false, statusCode: 404, message: "Lender not found" });
            return;
        }
        res.status(200).json(apiResponse(200, "Lender summary fetched", summary));
    } catch (error) {
        next(error);
    }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const stats = await summaryService.getDashboardStats();
        res.status(200).json(apiResponse(200, "Dashboard stats fetched", stats));
    } catch (error) {
        next(error);
    }
};

export const exportSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await summaryService.exportSummary();
        const headers = Object.keys(data[0] || {});
        const csvRows = [
            headers.join(","),
            ...data.map((row: Record<string, unknown>) =>
                headers.map(h => {
                    const val = String(row[h] ?? "");
                    return val.includes(",") ? `"${val}"` : val;
                }).join(",")
            ),
        ];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=lender-summary.csv");
        res.status(200).send(csvRows.join("\n"));
    } catch (error) {
        next(error);
    }
};
