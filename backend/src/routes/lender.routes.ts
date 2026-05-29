import { Router } from "express";
import {
    createLender, listLenders, getLender,
    updateLender, deleteLender, restoreLender, hardDeleteLender,
    exportLenders, getLenderStats,
} from "../controllers/lender.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { createLenderSchema, updateLenderSchema } from "../schemas/lender.schema";

const router = Router();
router.use(authenticate);

router.get("/stats",      asyncHandler(getLenderStats));
router.get("/export",     asyncHandler(exportLenders));
router.get("/export/csv", asyncHandler(exportLenders)); // legacy compat
router.get("/",           asyncHandler(listLenders));
router.post("/",          isAdmin, validate(createLenderSchema), asyncHandler(createLender));
router.get("/:id",        asyncHandler(getLender));
router.patch("/:id",      isAdmin, validate(updateLenderSchema), asyncHandler(updateLender));
router.delete("/:id",     isAdmin, asyncHandler(deleteLender));
router.patch("/:id/restore",  isAdmin, asyncHandler(restoreLender));
router.delete("/:id/hard",    isAdmin, asyncHandler(hardDeleteLender));

export default router;
