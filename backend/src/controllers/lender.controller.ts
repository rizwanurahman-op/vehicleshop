import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import lenderService from "../services/lender.service";
import { exportLendersPDF } from "../services/lender_export";
import { apiResponse } from "../utils/api-response";

export const createLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.create(req.body);
        res.status(201).json(apiResponse(201, "Lender created successfully", lender));
    } catch (error) { next(error); }
};

export const listLenders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await lenderService.list(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Lenders fetched successfully", data, meta));
    } catch (error) { next(error); }
};

export const getLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.getById(req.params.id as string);
        res.status(200).json(apiResponse(200, "Lender fetched successfully", lender));
    } catch (error) { next(error); }
};

export const updateLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.update(req.params.id as string, req.body);
        res.status(200).json(apiResponse(200, "Lender updated successfully", lender));
    } catch (error) { next(error); }
};

export const deleteLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.softDelete(req.params.id as string);
        res.status(200).json(apiResponse(200, "Lender deactivated successfully", lender));
    } catch (error) { next(error); }
};

export const restoreLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.restore(req.params.id as string);
        res.status(200).json(apiResponse(200, "Lender restored successfully", lender));
    } catch (error) { next(error); }
};

export const hardDeleteLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await lenderService.hardDelete(req.params.id as string);
        res.status(200).json(apiResponse(200, "Lender permanently deleted", null));
    } catch (error) { next(error); }
};

export const getLenderStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { status, search, dateFrom, dateTo } = req.query as Record<string, string>;
        const stats = await lenderService.getStats({ status, search, dateFrom, dateTo });
        res.status(200).json(apiResponse(200, "Lender stats fetched", stats));
    } catch (error) { next(error); }
};

export const exportLenders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { format = "csv", status, search, dateFrom, dateTo } = req.query as Record<string, string>;
        const timestamp = new Date().toISOString().slice(0, 10);
        const data = await lenderService.exportAll({ status, search, dateFrom, dateTo });

        if (format === "pdf") {
            const buf = await exportLendersPDF(data, { status, search, dateFrom, dateTo });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="lenders_${timestamp}.pdf"`);
            res.status(200).send(buf);
            return;
        }

        const esc = (x: unknown) => { const s = String(x ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const headers = ["Lender ID", "Name", "Phone", "Address", "Remarks", "Total Borrowed", "Total Repaid", "Balance Payable", "Status"];
        const rows = data.map((l: Record<string, unknown>) => [
            l["Lender ID"], l["Name"], l["Phone"], l["Address"], l["Remarks"],
            l["Total Borrowed (Rs.)"] ?? l["totalBorrowed"],
            l["Total Repaid (Rs.)"]   ?? l["totalRepaid"],
            l["Balance Payable (Rs.)"] ?? l["balancePayable"],
            l["Status"] ?? (l["isActive"] !== false ? "Active" : "Inactive"),
        ].map(esc).join(","));
        const csv = [headers.map(esc).join(","), ...rows].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="lenders_${timestamp}.csv"`);
        res.status(200).send("\uFEFF" + csv);
    } catch (error) { next(error); }
};
