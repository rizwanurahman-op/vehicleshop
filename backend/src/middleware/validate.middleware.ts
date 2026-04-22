import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map(issue => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
        res.status(400).json({
            success: false,
            statusCode: 400,
            message: "Validation failed",
            errors,
        });
        return;
    }
    req.body = result.data;
    next();
};
