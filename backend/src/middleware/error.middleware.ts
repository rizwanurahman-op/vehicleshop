import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error";
import { env } from "../config/env";

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
            errors: err.errors,
        });
        return;
    }

    // Service-layer duplicate / business-rule errors (e.g. duplicate registration)
    if (err instanceof Error && err.message.includes("already exists")) {
        res.status(409).json({
            success: false,
            statusCode: 409,
            message: err.message,
        });
        return;
    }

    // MongoDB duplicate key error
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 11000) {
        res.status(409).json({
            success: false,
            statusCode: 409,
            message: "Duplicate entry. This record already exists.",
        });
        return;
    }

    // Mongoose validation errors
    if (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "ValidationError") {
        res.status(400).json({
            success: false,
            statusCode: 400,
            message: "Validation failed",
        });
        return;
    }

    // CastError (invalid MongoDB ID)
    if (typeof err === "object" && err !== null && "name" in err && (err as { name: string }).name === "CastError") {
        res.status(400).json({
            success: false,
            statusCode: 400,
            message: "Invalid ID format",
        });
        return;
    }

    console.error("Unhandled error:", err);
    res.status(500).json({
        success: false,
        statusCode: 500,
        message: env.NODE_ENV === "production" ? "Internal server error" : (err as Error)?.message || "Unknown error",
    });
};
