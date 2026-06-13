import { Router } from "express";
import {
    createRepayment, listRepayments, getRepayment,
    updateRepayment, deleteRepayment, getRepaymentsByLender,
    exportRepayments, getRepaymentStats,
} from "../controllers/repayment.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter, writeLimiter } from "../middleware/rate-limit.middleware";
import { createRepaymentSchema, updateRepaymentSchema } from "../schemas/repayment.schema";

const router = Router();
router.use(authenticate);

router.get("/stats",               asyncHandler(getRepaymentStats));
router.get("/export",              exportLimiter, asyncHandler(exportRepayments));
router.get("/export/csv",          exportLimiter, asyncHandler(exportRepayments)); // legacy compat
router.get("/by-lender/:lenderId", asyncHandler(getRepaymentsByLender));
router.get("/",                    asyncHandler(listRepayments));
router.post("/",                   isAdmin, writeLimiter, validate(createRepaymentSchema), asyncHandler(createRepayment));
router.get("/:id",                 asyncHandler(getRepayment));
router.patch("/:id",               isAdmin, writeLimiter, validate(updateRepaymentSchema), asyncHandler(updateRepayment));
router.delete("/:id",              isAdmin, writeLimiter, asyncHandler(deleteRepayment));

export default router;
