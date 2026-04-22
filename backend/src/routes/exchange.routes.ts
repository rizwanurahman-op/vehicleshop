import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as ec from "../controllers/exchange.controller";

const router = Router();

router.use(authenticate);

router.get("/stats", ec.getExchangeStats);
router.get("/", ec.getExchanges);

export default router;
