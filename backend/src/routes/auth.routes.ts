import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { register, login, refresh, logout, getMe, updateProfile, changePassword } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from "../schemas/auth.schema";
import { authLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), asyncHandler(register));
router.post("/login", authLimiter, validate(loginSchema), asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/logout", asyncHandler(logout)); // No auth required — works even with expired access token
router.get("/me", authenticate, asyncHandler(getMe));
router.patch("/profile", authenticate, validate(updateProfileSchema), asyncHandler(updateProfile));
router.patch("/password", authenticate, validate(changePasswordSchema), asyncHandler(changePassword));

export default router;
