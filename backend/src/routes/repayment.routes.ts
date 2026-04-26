import { Router } from "express";
import {
    createRepayment,
    listRepayments,
    getRepayment,
    updateRepayment,
    deleteRepayment,
    getRepaymentsByLender,
    exportRepayments,
} from "../controllers/repayment.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createRepaymentSchema, updateRepaymentSchema } from "../schemas/repayment.schema";

const router = Router();
router.use(authenticate);

router.get("/export/csv", asyncHandler(exportRepayments));
router.get("/by-lender/:lenderId", asyncHandler(getRepaymentsByLender));
router.get("/", asyncHandler(listRepayments));
router.post("/", validate(createRepaymentSchema), asyncHandler(createRepayment));
router.get("/:id", asyncHandler(getRepayment));
router.patch("/:id", validate(updateRepaymentSchema), asyncHandler(updateRepayment));
router.delete("/:id", asyncHandler(deleteRepayment));

export default router;
