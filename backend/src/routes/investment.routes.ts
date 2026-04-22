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
import { createInvestmentSchema, updateInvestmentSchema } from "../schemas/investment.schema";

const router = Router();
router.use(authenticate);

router.get("/export/csv", exportInvestments);
router.get("/by-lender/:lenderId", getInvestmentsByLender);
router.get("/", listInvestments);
router.post("/", validate(createInvestmentSchema), createInvestment);
router.get("/:id", getInvestment);
router.patch("/:id", validate(updateInvestmentSchema), updateInvestment);
router.delete("/:id", deleteInvestment);

export default router;
