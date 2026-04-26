import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import * as ec from "../controllers/exchange.controller";

const router = Router();

router.use(authenticate);

router.get("/stats", asyncHandler(ec.getExchangeStats));
router.get("/", asyncHandler(ec.getExchanges));

export default router;
