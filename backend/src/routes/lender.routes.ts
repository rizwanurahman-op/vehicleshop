import { Router } from "express";
import {
    createLender,
    listLenders,
    getLender,
    updateLender,
    deleteLender,
    exportLenders,
} from "../controllers/lender.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate } from "../middleware/auth.middleware";
import { createLenderSchema, updateLenderSchema } from "../schemas/lender.schema";

const router = Router();

router.use(authenticate);

router.get("/export/csv", exportLenders);
router.get("/", listLenders);
router.post("/", validate(createLenderSchema), createLender);
router.get("/:id", getLender);
router.patch("/:id", validate(updateLenderSchema), updateLender);
router.delete("/:id", deleteLender);

export default router;
