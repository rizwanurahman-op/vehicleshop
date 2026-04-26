import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Wraps an async Express route handler so that any thrown error
 * is automatically forwarded to Express's error-handling middleware.
 *
 * Without this, Express 4 silently swallows promise rejections
 * from async handlers, and thrown errors never reach `errorHandler`.
 */
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
