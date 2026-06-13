import { z } from "zod";

// ─── Time string validator ────────────────────────────────────────────────────
const timeSchema = z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM 24-hour format (e.g., 02:30)");

// ─── Retention policy ─────────────────────────────────────────────────────────
const retentionPolicySchema = z.object({
    daily: z.number().int().min(1).max(30),
    weekly: z.number().int().min(1).max(12),
    monthly: z.number().int().min(1).max(12),
});

// ─── PUT /api/v1/backups/settings ────────────────────────────────────────────
export const updateBackupSettingsSchema = z.object({
    dailyEnabled: z.boolean(),
    dailyTime: timeSchema,
    weeklyEnabled: z.boolean(),
    weeklyDay: z.number().int().min(0).max(6, "Week day must be 0 (Sunday) to 6 (Saturday)"),
    weeklyTime: timeSchema,
    monthlyEnabled: z.boolean(),
    monthlyDay: z.number().int().min(1).max(28, "Month day must be 1-28"),
    monthlyTime: timeSchema,
    retentionPolicy: retentionPolicySchema,
});

export type UpdateBackupSettingsInput = z.infer<typeof updateBackupSettingsSchema>;

// ─── POST /api/v1/backups/trigger ─────────────────────────────────────────────
export const triggerBackupSchema = z.object({
    schedule: z.enum(["manual", "daily", "weekly", "monthly"]).default("manual"),
});

export type TriggerBackupInput = z.infer<typeof triggerBackupSchema>;
