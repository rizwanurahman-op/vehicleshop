import cron, { ScheduledTask } from "node-cron";
import { getBackupSettings, IBackupSettings } from "../models/backup-settings.model";
import { runBackup, BackupSchedule } from "./backup.service";

// ─── State ────────────────────────────────────────────────────────────────────

const scheduledTasks: Record<string, ScheduledTask> = {};

// ─── Cron Expression Builder ──────────────────────────────────────────────────
// All times are treated as IST (Asia/Kolkata).
// node-cron uses the system timezone by default; we pass timezone explicitly.

const buildDailyCron = (time: string): string => {
    const [hour, minute] = time.split(":").map(Number);
    return `${minute} ${hour} * * *`;
};

const buildWeeklyCron = (time: string, dayOfWeek: number): string => {
    const [hour, minute] = time.split(":").map(Number);
    return `${minute} ${hour} * * ${dayOfWeek}`;
};

const buildMonthlyCron = (time: string, dayOfMonth: number): string => {
    const [hour, minute] = time.split(":").map(Number);
    // Cap at 28 to avoid skipped months (Feb has min 28 days)
    const safeDay = Math.min(dayOfMonth, 28);
    return `${minute} ${hour} ${safeDay} * *`;
};

// ─── Task Management ──────────────────────────────────────────────────────────

const stopTask = (key: string): void => {
    if (scheduledTasks[key]) {
        scheduledTasks[key].stop();
        delete scheduledTasks[key];
        console.log(`🗓️  [Scheduler] Stopped ${key} backup job`);
    }
};

const startTask = (key: BackupSchedule, cronExpr: string): void => {
    stopTask(key);

    scheduledTasks[key] = cron.schedule(
        cronExpr,
        async () => {
            console.log(`⏰ [Scheduler] Running scheduled ${key} backup...`);
            try {
                await runBackup(key, null);
            } catch (err) {
                console.error(`❌ [Scheduler] Scheduled ${key} backup failed:`, err);
            }
        },
        {
            timezone: "Asia/Kolkata",
        }
    );

    console.log(`🗓️  [Scheduler] Started ${key} backup job: ${cronExpr} (IST)`);
};

// ─── Apply Settings ───────────────────────────────────────────────────────────

export const applyScheduleSettings = (settings: IBackupSettings): void => {
    // ── Daily ──────────────────────────────────────────────────────────────
    if (settings.dailyEnabled) {
        startTask("daily", buildDailyCron(settings.dailyTime));
    } else {
        stopTask("daily");
    }

    // ── Weekly ─────────────────────────────────────────────────────────────
    if (settings.weeklyEnabled) {
        startTask("weekly", buildWeeklyCron(settings.weeklyTime, settings.weeklyDay));
    } else {
        stopTask("weekly");
    }

    // ── Monthly ────────────────────────────────────────────────────────────
    if (settings.monthlyEnabled) {
        startTask("monthly", buildMonthlyCron(settings.monthlyTime, settings.monthlyDay));
    } else {
        stopTask("monthly");
    }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Called once at server startup. Loads current settings and initializes cron jobs.
 */
export const initializeBackupScheduler = async (): Promise<void> => {
    try {
        const settings = await getBackupSettings();
        applyScheduleSettings(settings);
        console.log("✅ Backup scheduler initialized");
    } catch (err) {
        console.error("❌ Failed to initialize backup scheduler:", err);
    }
};

/**
 * Called whenever backup settings are updated via the API.
 * Restarts all cron jobs with the new configuration.
 */
export const reloadScheduler = async (): Promise<void> => {
    try {
        const settings = await getBackupSettings();
        applyScheduleSettings(settings);
        console.log("🔄 Backup scheduler reloaded with new settings");
    } catch (err) {
        console.error("❌ Failed to reload backup scheduler:", err);
    }
};

const backupSchedulerService = { initializeBackupScheduler, reloadScheduler, applyScheduleSettings };
export default backupSchedulerService;
