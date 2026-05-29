import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { getSalesRegister, exportSalesRegister } from "../controllers/sales.controller";

const router = Router();
router.use(authenticate);

router.get("/", asyncHandler(getSalesRegister));
router.get("/export", asyncHandler(exportSalesRegister));

export default router;
