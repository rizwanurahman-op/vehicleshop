import fs from "fs";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { apiResponse } from "../utils/api-response";
import { NotFoundError } from "../utils/api-error";
import { BackupSettings, getBackupSettings } from "../models/backup-settings.model";
import { BackupLog } from "../models/backup-log.model";
import * as backupService from "../services/backup.service";
import * as schedulerService from "../services/backup-scheduler.service";
import * as telegramService from "../services/telegram.service";
import { UpdateBackupSettingsInput, TriggerBackupInput } from "../schemas/backup.schema";

// ─── GET /api/v1/backups ─────────────────────────────────────────────────────
export const getBackupHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page  = Math.max(1, parseInt(String(req.query.page  ?? "1"),  10));
        const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "20"), 10)));
        const result = await backupService.listBackups(page, limit);
        res.status(200).json(
            apiResponse(200, "Backup history fetched", result.data, {
                page: result.page, limit, total: result.total, totalPages: result.totalPages,
            })
        );
    } catch (error) { next(error); }
};

// ─── GET /api/v1/backups/settings ─────────────────────────────────────────────
export const getSettings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const settings = await getBackupSettings();
        res.status(200).json(apiResponse(200, "Backup settings fetched", settings));
    } catch (error) { next(error); }
};

// ─── PUT /api/v1/backups/settings ─────────────────────────────────────────────
export const updateSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const body = req.body as UpdateBackupSettingsInput;
        let settings = await BackupSettings.findOne();
        if (!settings) {
            settings = await BackupSettings.create({ ...body, lastModifiedBy: req.user!.userId });
        } else {
            Object.assign(settings, body);
            settings.lastModifiedBy = req.user!.userId as unknown as typeof settings.lastModifiedBy;
            await settings.save();
        }
        await schedulerService.reloadScheduler();
        res.status(200).json(apiResponse(200, "Backup settings updated successfully", settings));
    } catch (error) { next(error); }
};

// ─── POST /api/v1/backups/trigger ─────────────────────────────────────────────
export const triggerBackup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { schedule } = req.body as TriggerBackupInput;
        res.status(202).json(
            apiResponse(202, `Backup triggered. A ${schedule} backup is now running in the background.`)
        );
        backupService.runBackup(schedule, req.user!.userId).catch((err: unknown) => {
            console.error(`❌ Background ${schedule} backup failed:`, err);
        });
    } catch (error) { next(error); }
};

// ─── GET /api/v1/backups/status ───────────────────────────────────────────────
export const getStorageStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const configured = telegramService.isTelegramConfigured();
        const { env: envConfig } = await import("../config/env");
        const isPasswordProtected = !!envConfig.BACKUP_ZIP_PASSWORD;
        const isEmailConfigured   = !!(envConfig.EMAIL_USER && envConfig.EMAIL_PASS);

        if (!configured) {
            const total = await BackupLog.countDocuments({ status: "completed" });
            res.status(200).json(apiResponse(200, "Storage status", {
                configured: false,
                connected: false,
                storageType: "none",
                message: "Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env",
                totalBackups: total,
                isPasswordProtected,
                isEmailConfigured,
            }));
            return;
        }

        try {
            const [connectionInfo, total] = await Promise.all([
                telegramService.testTelegramConnection(),
                BackupLog.countDocuments({ status: "completed" }),
            ]);
            res.status(200).json(apiResponse(200, "Storage status", {
                configured: true,
                connected: true,
                storageType: "telegram",
                botName: connectionInfo.botName,
                chatId: connectionInfo.chatId,
                totalBackups: total,
                isPasswordProtected,
                isEmailConfigured,
            }));
        } catch (err) {
            res.status(200).json(apiResponse(200, "Storage status", {
                configured: true,
                connected: false,
                storageType: "telegram",
                message: err instanceof Error ? err.message : "Failed to connect to Telegram",
                isPasswordProtected,
                isEmailConfigured,
            }));
        }
    } catch (error) { next(error); }
};

// ─── GET /api/v1/backups/:id/download ────────────────────────────────────────
// Streams a locally stored backup (fallback only — Telegram is the primary storage)
export const downloadBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = String(req.params.id);
        const { filePath, fileName } = await backupService.getBackupLocalPath(id);
        const stat = fs.statSync(filePath);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.setHeader("Content-Length", stat.size);
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        stream.on("error", next);
    } catch (error) { next(error); }
};

// ─── DELETE /api/v1/backups/:id ──────────────────────────────────────────────
export const deleteBackup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const id = String(req.params.id);
        const log = await BackupLog.findById(id);
        if (!log) throw new NotFoundError("Backup");
        await backupService.deleteBackup(id);
        res.status(200).json(apiResponse(200, "Backup deleted successfully"));
    } catch (error) { next(error); }
};
