import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { apiResponse } from "../utils/api-response";
import { AuthRequest } from "../middleware/auth.middleware";
import { env } from "../config/env";

const IS_PROD = env.NODE_ENV === "production";

// ─── Cookie option factories ──────────────────────────────────────────────────
// Must match exactly when clearing — browser won't clear cookie unless options align.

// Access token: httpOnly so JavaScript cannot read/steal it (XSS mitigation).
// Kept short-lived (matches JWT_ACCESS_EXPIRY) — renewed silently by /auth/refresh.
const accessCookieOptions = (maxAge: number) => ({
    httpOnly: true,                                                // ← XSS protection: JS cannot read this
    secure: IS_PROD,                                               // HTTPS-only in production
    sameSite: (IS_PROD ? "strict" : "lax") as "strict" | "lax",  // CSRF mitigation
    path: "/",
    maxAge,
});

// Refresh token: long-lived, httpOnly, used only on /auth/refresh
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? "strict" : "lax") as "strict" | "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — matches JWT_REFRESH_EXPIRY
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? "strict" : "lax") as "strict" | "lax",
    path: "/",
};

// Access token cookie TTL: 15m = 900_000 ms (matches JWT_ACCESS_EXPIRY=15m).
// If the env value is changed, this should be updated to match.
const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

/** Set both tokens as httpOnly cookies and return user info + accessToken in body. */
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
    res.cookie("vb_access_token", accessToken, accessCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
    res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.register(req.body);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(201).json(
            apiResponse(201, "Admin registered successfully", {
                user: { id: user._id, username: user.username, email: user.email, role: user.role },
                accessToken: tokens.accessToken, // still returned in body for Zustand in-memory store
            })
        );
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { user, tokens } = await authService.login(req.body);
        setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
        res.status(200).json(
            apiResponse(200, "Logged in successfully", {
                user: { id: user._id, username: user.username, email: user.email, role: user.role },
                accessToken: tokens.accessToken, // still returned in body for Zustand in-memory store
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
        // refreshAccessToken now returns a full TokenPair (rotation: new refresh token each time)
        const tokens = await authService.refreshAccessToken(refreshToken);
        // Rotate BOTH cookies — old refresh token is invalidated in the DB by the service
        res.cookie("vb_access_token", tokens.accessToken, accessCookieOptions(ACCESS_TOKEN_MAX_AGE_MS));
        res.cookie("refreshToken", tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
        res.status(200).json(apiResponse(200, "Token refreshed", { accessToken: tokens.accessToken }));
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
        // Clear with EXACT same options the cookies were set with, otherwise browser ignores it
        res.clearCookie("vb_access_token", CLEAR_COOKIE_OPTIONS);
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

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const user = await authService.updateProfile(req.user!.userId, req.body);
        res.status(200).json(
            apiResponse(200, "Profile updated successfully", {
                user: { id: user._id, username: user.username, email: user.email, role: user.role },
            })
        );
    } catch (error) {
        next(error);
    }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        await authService.changePassword(req.user!.userId, req.body);
        res.status(200).json(apiResponse(200, "Password changed successfully"));
    } catch (error) {
        next(error);
    }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await authService.forgotPassword(req.body.email);
        res.status(200).json(
            apiResponse(200, "Password reset link has been sent to your email address.")
        );
    } catch (error) {
        next(error);
    }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await authService.resetPassword(req.body);
        res.status(200).json(apiResponse(200, "Password has been reset successfully. You can now log in."));
    } catch (error) {
        next(error);
    }
};
