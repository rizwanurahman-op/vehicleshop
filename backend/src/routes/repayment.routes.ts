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
import { createRepaymentSchema, updateRepaymentSchema } from "../schemas/repayment.schema";

const router = Router();
router.use(authenticate);

router.get("/export/csv", exportRepayments);
router.get("/by-lender/:lenderId", getRepaymentsByLender);
router.get("/", listRepayments);
router.post("/", validate(createRepaymentSchema), createRepayment);
router.get("/:id", getRepayment);
router.patch("/:id", validate(updateRepaymentSchema), updateRepayment);
router.delete("/:id", deleteRepayment);

export default router;
