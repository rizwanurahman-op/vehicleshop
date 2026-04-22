import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import repaymentService from "../services/repayment.service";
import { apiResponse } from "../utils/api-response";

export const createRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rep = await repaymentService.create(req.body);
        res.status(201).json(apiResponse(201, "Repayment recorded successfully", rep));
    } catch (error) {
        next(error);
    }
};

export const listRepayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await repaymentService.list(req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Repayments fetched successfully", data, meta));
    } catch (error) {
        next(error);
    }
};

export const getRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rep = await repaymentService.getById(req.params.id as string);
        res.status(200).json(apiResponse(200, "Repayment fetched successfully", rep));
    } catch (error) {
        next(error);
    }
};

export const updateRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const rep = await repaymentService.update(req.params.id as string, req.body);
        res.status(200).json(apiResponse(200, "Repayment updated successfully", rep));
    } catch (error) {
        next(error);
    }
};

export const deleteRepayment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await repaymentService.remove(req.params.id as string);
        res.status(200).json(apiResponse(200, "Repayment deleted successfully"));
    } catch (error) {
        next(error);
    }
};

export const getRepaymentsByLender = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, meta } = await repaymentService.getByLender(req.params.lenderId as string, req.query as Record<string, string>);
        res.status(200).json(apiResponse(200, "Repayments by lender fetched", data, meta));
    } catch (error) {
        next(error);
    }
};

export const exportRepayments = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const data = await repaymentService.exportAll(req.query as Record<string, string>);
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
        res.setHeader("Content-Disposition", "attachment; filename=repayments.csv");
        res.status(200).send(csvRows.join("\n"));
    } catch (error) {
        next(error);
    }
};
