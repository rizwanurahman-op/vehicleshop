import { Router } from "express";
import {
    createInvestment, listInvestments, getInvestment,
    updateInvestment, deleteInvestment, getInvestmentsByLender,
    exportInvestments, getInvestmentStats,
} from "../controllers/investment.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter, writeLimiter } from "../middleware/rate-limit.middleware";
import { createInvestmentSchema, updateInvestmentSchema } from "../schemas/investment.schema";

const router = Router();
router.use(authenticate);

router.get("/stats",               asyncHandler(getInvestmentStats));
router.get("/export",              exportLimiter, asyncHandler(exportInvestments));
router.get("/export/csv",          exportLimiter, asyncHandler(exportInvestments)); // legacy compat
router.get("/by-lender/:lenderId", asyncHandler(getInvestmentsByLender));
router.get("/",                    asyncHandler(listInvestments));
router.post("/",                   isAdmin, writeLimiter, validate(createInvestmentSchema), asyncHandler(createInvestment));
router.get("/:id",                 asyncHandler(getInvestment));
router.patch("/:id",               isAdmin, writeLimiter, validate(updateInvestmentSchema), asyncHandler(updateInvestment));
router.delete("/:id",              isAdmin, writeLimiter, asyncHandler(deleteInvestment));

export default router;
