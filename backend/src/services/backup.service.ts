import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import archiver from "archiver";
import mongoose from "mongoose";
import { BackupLog, ICollectionCounts } from "../models/backup-log.model";
import { getBackupSettings } from "../models/backup-settings.model";
import * as telegramService from "./telegram.service";
import { env } from "../config/env";
import { sendEmail } from "./email.service";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BackupSchedule = "manual" | "daily" | "weekly" | "monthly";

export interface BackupResult {
    backupId: string;
    fileName: string;
    telegramMessageId: number | null;
    telegramLink: string | null;
    fileSize: number;
    checksum: string;
    isPasswordProtected: boolean;
    collections: ICollectionCounts;
    totalRecords: number;
    completedAt: Date;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatTimestamp = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ─── SHA-256 Checksum ─────────────────────────────────────────────────────────
// Verifies backup file integrity — detects corruption or tampering

const computeSHA256 = (filePath: string): string => {
    const hash = crypto.createHash("sha256");
    const data = fs.readFileSync(filePath);
    hash.update(data);
    return hash.digest("hex");
};

// ─── Export All Collections to JSON Files ─────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const writeCollection = async (filePath: string, docs: any[]): Promise<number> => {
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), "utf-8");
    return docs.length;
};

const exportCollections = async (exportDir: string): Promise<ICollectionCounts> => {
    const counts: ICollectionCounts = {
        lenders: 0, investments: 0, repayments: 0, vehicles: 0,
        consignments: 0, vehicleOwners: 0, users: 0, counters: 0,
    };

    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB connection not ready for backup");

    const fetchAll = async (collectionName: string, projection?: Record<string, 0 | 1>) => {
        const col = db.collection(collectionName);
        return projection
            ? col.find({}, { projection }).toArray()
            : col.find({}).toArray();
    };

    counts.lenders       = await writeCollection(path.join(exportDir, "lenders.json"),        await fetchAll("lenders"));
    counts.investments   = await writeCollection(path.join(exportDir, "investments.json"),    await fetchAll("investments"));
    counts.repayments    = await writeCollection(path.join(exportDir, "repayments.json"),     await fetchAll("repayments"));
    counts.vehicles      = await writeCollection(path.join(exportDir, "vehicles.json"),       await fetchAll("vehicles"));
    counts.consignments  = await writeCollection(path.join(exportDir, "consignments.json"),   await fetchAll("consignmentvehicles"));
    counts.vehicleOwners = await writeCollection(path.join(exportDir, "vehicle-owners.json"), await fetchAll("vehicleowners"));
    counts.users         = await writeCollection(
        path.join(exportDir, "users.json"),
        await fetchAll("users", { passwordHash: 0, refreshToken: 0, passwordResetToken: 0, passwordResetExpires: 0 })
    );
    counts.counters      = await writeCollection(path.join(exportDir, "counters.json"),       await fetchAll("counters"));

    return counts;
};

// ─── Create ZIP — with optional AES-256 password protection ──────────────────
// If BACKUP_ZIP_PASSWORD is set in env, the ZIP is created with password-protection
// using archiver-zip-encrypted (AES-256). The ZIP can be opened by any standard
// ZIP tool (7-Zip, WinZip, macOS Archive Utility) using the configured password.

// Guard: archiver.registerFormat throws if called more than once for the same
// format name. Register the encrypted format exactly once at module load time.
let _zipEncryptedRegistered = false;
const ensureZipEncryptedRegistered = (): void => {
    if (_zipEncryptedRegistered) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const archiverZipEncrypted = require("archiver-zip-encrypted");
    archiver.registerFormat("zip-encrypted", archiverZipEncrypted);
    _zipEncryptedRegistered = true;
};

const createZip = (exportDir: string, zipPath: string, password?: string): Promise<void> =>
    new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        let archive: archiver.Archiver;

        if (password) {
            ensureZipEncryptedRegistered();
            archive = archiver.create("zip-encrypted" as "zip", {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                zlib: { level: 8 }, encryptionMethod: "aes256", password,
            } as unknown as archiver.ZipOptions);
        } else {
            archive = archiver("zip", { zlib: { level: 9 } });
        }

        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(exportDir, false);
        archive.finalize();
    });

// ─── Build Telegram caption ───────────────────────────────────────────────────

const buildCaption = (
    backupId: string,
    schedule: BackupSchedule,
    fileSize: number,
    totalRecords: number,
    collections: ICollectionCounts,
    checksum: string,
    isPasswordProtected: boolean
): string => {
    const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    return [
        `🗄 <b>VehicleBook Backup</b>`,
        ``,
        `📋 <b>ID:</b> ${backupId}`,
        `⏱ <b>Type:</b> ${schedule.charAt(0).toUpperCase() + schedule.slice(1)}`,
        `📅 <b>Time:</b> ${now} IST`,
        `📦 <b>Size:</b> ${formatFileSize(fileSize)}`,
        `🔢 <b>Total Records:</b> ${totalRecords.toLocaleString("en-IN")}`,
        ``,
        `<b>Collections:</b>`,
        `  • Lenders: ${collections.lenders}`,
        `  • Investments: ${collections.investments}`,
        `  • Repayments: ${collections.repayments}`,
        `  • Vehicles: ${collections.vehicles}`,
        `  • Consignments: ${collections.consignments}`,
        `  • Vehicle Owners: ${collections.vehicleOwners}`,
        `  • Users: ${collections.users}`,
        ``,
        `🔒 <b>Security:</b>`,
        isPasswordProtected
            ? `  • Password protected (AES-256) ✅`
            : `  • No password (set BACKUP_ZIP_PASSWORD in .env)`,
        `  • SHA-256: <code>${checksum.substring(0, 24)}…</code>`,
    ].join("\n");
};

// ─── Send backup result email ─────────────────────────────────────────────────

const sendBackupEmail = async (
    success: boolean,
    backupId: string,
    schedule: BackupSchedule,
    details: { fileSize?: number; totalRecords?: number; telegramLink?: string | null; error?: string }
): Promise<void> => {
    if (!env.EMAIL_USER) return; // Email not configured — skip silently

    try {
        const subject = success
            ? `✅ VehicleBook Backup Completed — ${backupId}`
            : `⚠️ VehicleBook Backup FAILED — ${backupId}`;

        const html = success
            ? `
<div style="font-family:sans-serif;max-width:500px">
  <h2 style="color:#16a34a">✅ Backup Completed</h2>
  <table style="width:100%;border-collapse:collapse">
    <tr><td style="padding:6px;color:#666">Backup ID</td><td style="padding:6px;font-weight:bold">${backupId}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:6px;color:#666">Schedule</td><td style="padding:6px">${schedule}</td></tr>
    <tr><td style="padding:6px;color:#666">File Size</td><td style="padding:6px">${formatFileSize(details.fileSize ?? 0)}</td></tr>
    <tr style="background:#f9f9f9"><td style="padding:6px;color:#666">Total Records</td><td style="padding:6px">${(details.totalRecords ?? 0).toLocaleString("en-IN")}</td></tr>
    ${details.telegramLink ? `<tr><td style="padding:6px;color:#666">Telegram</td><td style="padding:6px"><a href="${details.telegramLink}">Open backup in Telegram</a></td></tr>` : ""}
  </table>
  <p style="color:#888;font-size:12px">🔒 This backup is password protected. Use your configured ZIP password to open it.</p>
</div>`
            : `
<div style="font-family:sans-serif;max-width:500px">
  <h2 style="color:#dc2626">⚠️ Backup Failed</h2>
  <p><strong>Backup ID:</strong> ${backupId}</p>
  <p><strong>Schedule:</strong> ${schedule}</p>
  <p><strong>Error:</strong></p>
  <pre style="background:#fef2f2;padding:12px;border-radius:4px;color:#dc2626">${details.error}</pre>
  <p>Please check the Backup Center in your dashboard.</p>
</div>`;

        await sendEmail({ to: env.EMAIL_USER, subject, html });
        console.log(`📧 [Backup] Email notification sent — ${success ? "success" : "failure"}`);
    } catch (emailErr) {
        // Non-fatal — backup itself succeeded even if email fails
        console.warn("⚠️  [Backup] Could not send email notification:", emailErr);
    }
};

// ─── Rotation: Delete old backups beyond retention limit ──────────────────────
// Runs after every scheduled backup. Counts ALL completed backups of this type
// (including the one just created), then purges the oldest ones so only
// `retentionLimit` remain — both on Telegram and in the database.

const applyRotation = async (schedule: Exclude<BackupSchedule, "manual">): Promise<void> => {
    const settings = await getBackupSettings();
    const retentionLimit = settings.retentionPolicy[schedule];

    // Fetch ALL completed backups for this schedule type, sorted oldest first.
    // We include the newly created backup so the count is accurate.
    const allCompleted = await BackupLog.find({
        schedule,
        status: "completed",
    }).sort({ startedAt: 1 });

    const excessCount = allCompleted.length - retentionLimit;
    if (excessCount <= 0) return; // Still within retention window — nothing to do

    // The oldest N backups need to be removed
    const toDelete = allCompleted.slice(0, excessCount);

    console.log(
        `🔄 [Rotation] ${schedule}: ${allCompleted.length} completed, keeping ${retentionLimit}, ` +
        `deleting ${toDelete.length} oldest backup(s)`
    );

    for (const backup of toDelete) {
        try {
            // 1. Delete from Telegram (best-effort — may already be gone)
            if (backup.telegramMessageId && telegramService.isTelegramConfigured()) {
                await telegramService.deleteBackupFromTelegram(backup.telegramMessageId);
                console.log(`🗑️  [Rotation] Deleted from Telegram: ${backup.fileName}`);
            }

            // 2. Fully remove the record from the database — no zombie entries
            await BackupLog.findByIdAndDelete(backup._id);
            console.log(`🗑️  [Rotation] Removed backup record: ${backup.backupId} (${backup.fileName})`);
        } catch (err) {
            console.error(`⚠️  [Rotation] Failed to purge backup ${backup.fileName}:`, err);
        }
    }
};

// ─── Main Backup Runner ───────────────────────────────────────────────────────

export const runBackup = async (
    schedule: BackupSchedule,
    userId: string | null = null
): Promise<BackupResult> => {
    const timestamp = formatTimestamp();
    const password = env.BACKUP_ZIP_PASSWORD || undefined;
    const fileName = `vehiclebook_backup_${schedule}_${timestamp}.zip`;
    const isPasswordProtected = !!password;

    // Generate backup ID
    const backupId = await (async () => {
        const Counter = mongoose.model("Counter");
        const counter = await Counter.findOneAndUpdate(
            { name: "backup" },
            { $inc: { seq: 1 }, $setOnInsert: { prefix: "BKP-", padding: 5 } },
            { upsert: true, new: true }
        );
        const paddedSeq = String(counter!.seq).padStart(counter!.padding, "0");
        return `${counter!.prefix}${paddedSeq}`;
    })();

    const logEntry = await BackupLog.create({
        backupId, schedule, status: "in_progress", fileName, isPasswordProtected,
        startedAt: new Date(),
        createdBy: userId ? new mongoose.Types.ObjectId(userId) : null,
    });

    const tmpBase = os.tmpdir();
    const exportDir = path.join(tmpBase, `vehiclebook_export_${timestamp}`);
    const zipPath = path.join(tmpBase, fileName);

    try {
        fs.mkdirSync(exportDir, { recursive: true });
        console.log(`📦 [Backup] Starting ${schedule} backup (${backupId})${isPasswordProtected ? " 🔒" : ""}...`);

        // 1. Export all collections
        console.log("📋 [Backup] Exporting collections...");
        const collections = await exportCollections(exportDir);
        const totalRecords = Object.values(collections).reduce((s, n) => s + n, 0);
        console.log(`✅ [Backup] Exported ${totalRecords} records`);

        // 2. Create ZIP (password-protected if BACKUP_ZIP_PASSWORD is set)
        console.log(`🗜️  [Backup] Creating ${isPasswordProtected ? "password-protected " : ""}ZIP...`);
        await createZip(exportDir, zipPath, password);
        const fileSize = fs.statSync(zipPath).size;
        console.log(`✅ [Backup] ZIP created: ${formatFileSize(fileSize)}`);

        // 3. SHA-256 integrity checksum
        const checksum = computeSHA256(zipPath);
        console.log(`🔐 [Backup] SHA-256: ${checksum.substring(0, 16)}…`);

        // 4. Upload to Telegram
        let telegramMessageId: number | null = null;
        let telegramLink: string | null = null;

        if (telegramService.isTelegramConfigured()) {
            console.log("📨 [Backup] Uploading to Telegram...");
            const caption = buildCaption(backupId, schedule, fileSize, totalRecords, collections, checksum, isPasswordProtected);
            const uploaded = await telegramService.uploadBackupToTelegram(zipPath, fileName, caption);
            telegramMessageId = uploaded.messageId;
            telegramLink = uploaded.messageLink;
            console.log(`✅ [Backup] Uploaded to Telegram — ${telegramLink}`);
        } else {
            console.warn("⚠️  [Backup] Telegram not configured — skipping upload");
        }

        // 5. Update log as completed
        await BackupLog.findByIdAndUpdate(logEntry._id, {
            status: "completed",
            telegramMessageId,
            telegramLink,
            fileSize,
            checksum,
            isPasswordProtected,
            collections,
            totalRecords,
            completedAt: new Date(),
        });

        // 6. Apply retention rotation (delete oldest beyond limit)
        if (schedule !== "manual") {
            await applyRotation(schedule);
        }

        console.log(`🎉 [Backup] ${schedule} backup completed (${backupId})`);

        // 7. Email success notification
        await sendBackupEmail(true, backupId, schedule, { fileSize, totalRecords, telegramLink });

        return {
            backupId, fileName, telegramMessageId, telegramLink,
            fileSize, checksum, isPasswordProtected,
            collections, totalRecords, completedAt: new Date(),
        };

    } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`❌ [Backup] ${schedule} backup failed:`, errMsg);
        await BackupLog.findByIdAndUpdate(logEntry._id, {
            status: "failed", error: errMsg, completedAt: new Date(),
        });

        // Email failure alert
        await sendBackupEmail(false, backupId, schedule, { error: errMsg });

        throw error;
    } finally {
        try {
            if (fs.existsSync(exportDir)) fs.rmSync(exportDir, { recursive: true, force: true });
            if (fs.existsSync(zipPath))   fs.unlinkSync(zipPath);
        } catch { /* non-fatal */ }
    }
};

// ─── List Backup History ──────────────────────────────────────────────────────

export const listBackups = async (page = 1, limit = 20) => {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
        BackupLog.find().sort({ startedAt: -1 }).skip(skip).limit(limit).lean(),
        BackupLog.countDocuments(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
};

// ─── Delete a specific backup ─────────────────────────────────────────────────

export const deleteBackup = async (id: string): Promise<void> => {
    const log = await BackupLog.findById(id);
    if (!log) throw new Error("Backup record not found");

    if (log.telegramMessageId && telegramService.isTelegramConfigured()) {
        await telegramService.deleteBackupFromTelegram(log.telegramMessageId);
    }

    await BackupLog.findByIdAndDelete(id);
};

// ─── Get local path for download (fallback only) ──────────────────────────────

export const getBackupLocalPath = async (id: string): Promise<{ filePath: string; fileName: string }> => {
    const log = await BackupLog.findById(id);
    if (!log) throw new Error("Backup not found");
    if (!log.localPath || !fs.existsSync(log.localPath)) {
        throw new Error("This backup is stored on Telegram — open the Telegram link to download it");
    }
    return { filePath: log.localPath, fileName: log.fileName };
};

const backupService = { runBackup, listBackups, deleteBackup, getBackupLocalPath };
export default backupService;
