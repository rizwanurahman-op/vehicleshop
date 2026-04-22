import { Router } from "express";
import { getLenderSummary, getSingleLenderSummary, getDashboardStats, exportSummary } from "../controllers/summary.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();
router.use(authenticate);

router.get("/dashboard", getDashboardStats);
router.get("/lenders", getLenderSummary);
router.get("/lenders/:lenderId", getSingleLenderSummary);
router.get("/export/csv", exportSummary);

export default router;
