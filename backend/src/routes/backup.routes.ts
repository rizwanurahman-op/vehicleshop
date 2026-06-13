import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middleware/validate.middleware";
import { updateBackupSettingsSchema, triggerBackupSchema } from "../schemas/backup.schema";
import { backupReadLimiter, backupTriggerLimiter } from "../middleware/rate-limit.middleware";
import {
    getBackupHistory,
    getSettings,
    updateSettings,
    triggerBackup,
    getStorageStatus,
    downloadBackup,
    deleteBackup,
} from "../controllers/backup.controller";

const router = Router();

// All backup routes require authentication + admin role
router.use(authenticate, isAdmin);

// ── Storage status ─────────────────────────────────────────────────────────────
// backupReadLimiter: polled every 2 min by the dashboard — generous limit, counts only failures
router.get("/status", backupReadLimiter, asyncHandler(getStorageStatus));

// ── Backup settings ────────────────────────────────────────────────────────────
router.get("/settings", backupReadLimiter, asyncHandler(getSettings));
router.put("/settings", validate(updateBackupSettingsSchema), asyncHandler(updateSettings));

// ── Manual trigger ─────────────────────────────────────────────────────────────
// backupTriggerLimiter: running a backup is expensive — max 10 per 15 min
router.post("/trigger", backupTriggerLimiter, validate(triggerBackupSchema), asyncHandler(triggerBackup));

// ── Backup history ─────────────────────────────────────────────────────────────
// backupReadLimiter: polled every 30s by the history table
router.get("/", backupReadLimiter, asyncHandler(getBackupHistory));

// ── Download a specific backup ZIP ────────────────────────────────────────────
router.get("/:id/download", asyncHandler(downloadBackup));

// ── Delete a specific backup ───────────────────────────────────────────────────
router.delete("/:id", asyncHandler(deleteBackup));

export default router;
