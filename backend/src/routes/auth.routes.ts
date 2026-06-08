import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import {
    register,
    login,
    refresh,
    logout,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
} from "../schemas/auth.schema";
import { authLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), asyncHandler(register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout)); // No auth required — works even with expired access token
router.get("/me", authenticate, asyncHandler(getMe));
router.patch("/profile", authenticate, validate(updateProfileSchema), asyncHandler(updateProfile));
router.patch("/password", authenticate, validate(changePasswordSchema), asyncHandler(changePassword));

// Password reset flow (public)
router.post("/forgot-password", authLimiter, validate(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post("/reset-password", authLimiter, validate(resetPasswordSchema), asyncHandler(resetPassword));

export default router;

