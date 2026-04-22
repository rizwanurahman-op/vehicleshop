import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import investmentService from "../services/investment.service";
import { apiResponse } from "../utils/api-response";

export const createInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const inv = await investmentService.create(req.body);
        res.status(201).json(apiResponse(201, "Investment recorded successfully", inv));
    } catch (error) {
        next(error);
    }
};

export const listInvestments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await investmentService.list(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Investments fetched successfully", data, meta));
    } catch (error) {
        next(error);
    }
};

export const getInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const inv = await investmentService.getById(req.params.id as string);
        res.status(200).json(apiResponse(200, "Investment fetched successfully", inv));
    } catch (error) {
        next(error);
    }
};

export const updateInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const inv = await investmentService.update(req.params.id as string, req.body);
        res.status(200).json(apiResponse(200, "Investment updated successfully", inv));
    } catch (error) {
        next(error);
    }
};

export const deleteInvestment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await investmentService.remove(req.params.id as string);
        res.status(200).json(apiResponse(200, "Investment deleted successfully"));
    } catch (error) {
        next(error);
    }
};

export const getInvestmentsByLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await investmentService.getByLender(req.params.lenderId as string, req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Investments by lender fetched", data, meta));
    } catch (error) {
        next(error);
    }
};

export const exportInvestments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await investmentService.exportAll(req.query as Record<string, string>);
        const headers = Object.keys(data[0] || {});
        const csvRows = [
            headers.join(","),
            ...data.map(row =>
                headers.map(h => {
                    const val = String((row as Record<string, unknown>)[h] ?? "");
                    return val.includes(",") ? `"${val}"` : val;
                }).join(",")
            ),
        ];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=investments.csv");
        res.status(200).send(csvRows.join("\n"));
    } catch (error) {
        next(error);
    }
};
