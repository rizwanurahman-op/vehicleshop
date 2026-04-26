import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { apiResponse } from "../utils/api-response";
import { AuthRequest } from "../middleware/auth.middleware";
import { env } from "../config/env";

// Must match exactly when clearing — browser won't clear cookie unless options align
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.register(req.body);
        res.cookie("refreshToken", tokens.refreshToken, { ...REFRESH_COOKIE_OPTIONS });
        res.status(201).json(
            apiResponse(201, "Admin registered successfully", {
                user: { id: user._id, username: user.username, email: user.email, role: user.role },
                accessToken: tokens.accessToken,
            })
        );
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.login(req.body);
        res.cookie("refreshToken", tokens.refreshToken, { ...REFRESH_COOKIE_OPTIONS });
        res.status(200).json(
            apiResponse(200, "Logged in successfully", {
                user: { id: user._id, username: user.username, email: user.email, role: user.role },
                accessToken: tokens.accessToken,
            })
        );
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ success: false, statusCode: 401, message: "No refresh token" });
            return;
        }
        const accessToken = await authService.refreshAccessToken(refreshToken);
        res.status(200).json(apiResponse(200, "Token refreshed", { accessToken }));
    } catch (error) {
        next(error);
    }
};

// Logout does NOT require authenticate middleware — it must work even with an expired access token.
// We identify the user from the httpOnly refreshToken cookie instead.
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const refreshToken = req.cookies?.refreshToken;
        if (refreshToken) {
            // Best-effort: revoke the refresh token in DB (ignore errors — always clear cookie)
            await authService.logoutByRefreshToken(refreshToken).catch(() => null);
        }
        // Clear with EXACT same options the cookie was set with, otherwise browser ignores it
        res.clearCookie("refreshToken", CLEAR_COOKIE_OPTIONS);
        res.status(200).json(apiResponse(200, "Logged out successfully"));
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await authService.getMe(req.user!.userId);
        res.status(200).json(apiResponse(200, "User profile fetched", user));
    } catch (error) {
        next(error);
    }
};
