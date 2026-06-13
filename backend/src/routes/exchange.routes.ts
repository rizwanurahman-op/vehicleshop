import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter } from "../middleware/rate-limit.middleware";
import * as ec from "../controllers/exchange.controller";

const router = Router();

router.use(authenticate);

router.get("/stats",  asyncHandler(ec.getExchangeStats));
router.get("/export", exportLimiter, asyncHandler(ec.exportExchanges));
router.get("/",       asyncHandler(ec.getExchanges));

export default router;
