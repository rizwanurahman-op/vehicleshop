import { Router } from "express";
import { getLenderSummary, getSingleLenderSummary, getDashboardStats, exportSummary } from "../controllers/summary.controller";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.use(authenticate);

router.get("/dashboard",           asyncHandler(getDashboardStats));
router.get("/lenders",             asyncHandler(getLenderSummary));
router.get("/lenders/:lenderId",   asyncHandler(getSingleLenderSummary));
router.get("/export",              asyncHandler(exportSummary));   // ?format=csv|pdf &status=&search=&dateFrom=&dateTo=
router.get("/export/csv",          asyncHandler(exportSummary));   // legacy compat

export default router;
