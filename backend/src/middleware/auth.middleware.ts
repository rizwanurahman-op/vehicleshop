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

/**
 * Authenticate middleware.
 *
 * Token resolution order:
 *  1. Authorization: Bearer <token>  ← primary (used by axios interceptor)
 *  2. vb_access_token cookie         ← fallback (httpOnly cookie set by backend on login/refresh)
 *
 * This dual-source approach means:
 * - Client-side API calls use the Authorization header (token in Zustand memory)
 * - Next.js middleware reads the httpOnly cookie (JS-inaccessible, XSS-safe)
 * - Both paths verify the SAME JWT with the SAME secret
 */
export const authenticate = (req: AuthRequest, _res: Response, next: NextFunction): void => {
    let token: string | undefined;

    // 1. Try Authorization header first (preferred for API calls)
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    // 2. Fallback: httpOnly cookie (used by server-side renders & when header is absent)
    if (!token) {
        token = req.cookies?.vb_access_token;
    }

    if (!token) {
        throw new UnauthorizedError("No token provided");
    }

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
