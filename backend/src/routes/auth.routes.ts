import { Router } from "express";
import { register, login, refresh, logout, getMe } from "../controllers/auth.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { registerSchema, loginSchema } from "../schemas/auth.schema";
import { authLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

export default router;
