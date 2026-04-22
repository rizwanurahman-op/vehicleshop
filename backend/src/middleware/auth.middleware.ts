import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../utils/api-error";

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        role: string;
    };
}

export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { userId: string; role: string };
        req.user = decoded;
        next();
    } catch {
        throw new UnauthorizedError("Invalid or expired token");
    }
};

export const isAdmin = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (req.user?.role !== "admin") {
        throw new UnauthorizedError("Admin access required");
    }
    next();
};
