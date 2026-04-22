import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { getSalesRegister } from "../controllers/sales.controller";

const router = Router();
router.use(authenticate);

router.get("/", getSalesRegister);

export default router;
