import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { apiResponse } from "../utils/api-response";
import { AuthRequest } from "../middleware/auth.middleware";
import { env } from "../config/env";

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.register(req.body);
        res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
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
        res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
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

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (req.user?.userId) await authService.logout(req.user.userId);
        res.clearCookie("refreshToken");
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
