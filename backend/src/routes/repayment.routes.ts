import { Router } from "express";
import {
    createRepayment, listRepayments, getRepayment,
    updateRepayment, deleteRepayment, getRepaymentsByLender,
    exportRepayments, getRepaymentStats,
} from "../controllers/repayment.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createRepaymentSchema, updateRepaymentSchema } from "../schemas/repayment.schema";

const router = Router();
router.use(authenticate);

router.get("/stats",               asyncHandler(getRepaymentStats));
router.get("/export",              asyncHandler(exportRepayments));
router.get("/export/csv",          asyncHandler(exportRepayments)); // legacy compat
router.get("/by-lender/:lenderId", asyncHandler(getRepaymentsByLender));
router.get("/",                    asyncHandler(listRepayments));
router.post("/",                   isAdmin, validate(createRepaymentSchema), asyncHandler(createRepayment));
router.get("/:id",                 asyncHandler(getRepayment));
router.patch("/:id",               isAdmin, validate(updateRepaymentSchema), asyncHandler(updateRepayment));
router.delete("/:id",              isAdmin, asyncHandler(deleteRepayment));

export default router;
