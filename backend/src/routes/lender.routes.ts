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
import { asyncHandler } from "../utils/async-handler";
import { createLenderSchema, updateLenderSchema } from "../schemas/lender.schema";

const router = Router();

router.use(authenticate);

router.get("/export/csv", asyncHandler(exportLenders));
router.get("/", asyncHandler(listLenders));
router.post("/", validate(createLenderSchema), asyncHandler(createLender));
router.get("/:id", asyncHandler(getLender));
router.patch("/:id", validate(updateLenderSchema), asyncHandler(updateLender));
router.delete("/:id", asyncHandler(deleteLender));

export default router;
