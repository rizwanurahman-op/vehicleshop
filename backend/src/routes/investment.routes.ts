import { Router } from "express";
import {
    createInvestment,
    listInvestments,
    getInvestment,
    updateInvestment,
    deleteInvestment,
    getInvestmentsByLender,
    exportInvestments,
} from "../controllers/investment.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createInvestmentSchema, updateInvestmentSchema } from "../schemas/investment.schema";

const router = Router();
router.use(authenticate);

router.get("/export/csv", asyncHandler(exportInvestments));
router.get("/by-lender/:lenderId", asyncHandler(getInvestmentsByLender));
router.get("/", asyncHandler(listInvestments));
router.post("/", validate(createInvestmentSchema), asyncHandler(createInvestment));
router.get("/:id", asyncHandler(getInvestment));
router.patch("/:id", validate(updateInvestmentSchema), asyncHandler(updateInvestment));
router.delete("/:id", asyncHandler(deleteInvestment));

export default router;
