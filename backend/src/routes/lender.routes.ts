import { Router } from "express";
import {
    createLender, listLenders, getLender,
    updateLender, deleteLender, restoreLender, hardDeleteLender,
    exportLenders, getLenderStats, exportLenderStatement,
} from "../controllers/lender.controller";
import { validate } from "../middleware/validate.middleware";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter, writeLimiter } from "../middleware/rate-limit.middleware";
import { createLenderSchema, updateLenderSchema } from "../schemas/lender.schema";

const router = Router();
router.use(authenticate);

router.get("/stats",      asyncHandler(getLenderStats));
router.get("/export",     exportLimiter, asyncHandler(exportLenders));
router.get("/export/csv", exportLimiter, asyncHandler(exportLenders)); // legacy compat
router.get("/",           asyncHandler(listLenders));
router.post("/",          isAdmin, writeLimiter, validate(createLenderSchema), asyncHandler(createLender));
router.get("/:id",            asyncHandler(getLender));
router.get("/:id/statement",  exportLimiter, asyncHandler(exportLenderStatement));
router.patch("/:id",      isAdmin, writeLimiter, validate(updateLenderSchema), asyncHandler(updateLender));
router.delete("/:id",     isAdmin, writeLimiter, asyncHandler(deleteLender));
router.patch("/:id/restore",  isAdmin, writeLimiter, asyncHandler(restoreLender));
router.delete("/:id/hard",    isAdmin, writeLimiter, asyncHandler(hardDeleteLender));

export default router;
