import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import lenderService from "../services/lender.service";
import { apiResponse } from "../utils/api-response";

export const createLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.create(req.body);
        res.status(201).json(apiResponse(201, "Lender created successfully", lender));
    } catch (error) {
        next(error);
    }
};

export const listLenders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await lenderService.list(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Lenders fetched successfully", data, meta));
    } catch (error) {
        next(error);
    }
};

export const getLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.getById(req.params.id as string);
        res.status(200).json(apiResponse(200, "Lender fetched successfully", lender));
    } catch (error) {
        next(error);
    }
};

export const updateLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.update(req.params.id as string, req.body);
        res.status(200).json(apiResponse(200, "Lender updated successfully", lender));
    } catch (error) {
        next(error);
    }
};

export const deleteLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const lender = await lenderService.softDelete(req.params.id as string);
        res.status(200).json(apiResponse(200, "Lender deactivated successfully", lender));
    } catch (error) {
        next(error);
    }
};

export const exportLenders = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await lenderService.exportAll();
        const headers = Object.keys(data[0] || {});
        const csvRows = [
            headers.join(","),
            ...data.map((row: Record<string, unknown>) =>
                headers.map(h => {
                    const val = String((row as Record<string, unknown>)[h] ?? "");
                    return val.includes(",") ? `"${val}"` : val;
                }).join(",")
            ),
        ];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=lenders.csv");
        res.status(200).send(csvRows.join("\n"));
    } catch (error) {
        next(error);
    }
};
