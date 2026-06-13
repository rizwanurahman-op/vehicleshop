import mongoose, { Schema, Document } from "mongoose";

export interface IRetentionPolicy {
    daily: number;
    weekly: number;
    monthly: number;
}

export interface IBackupSettings extends Document {
    dailyEnabled: boolean;
    dailyTime: string;
    weeklyEnabled: boolean;
    weeklyDay: number;
    weeklyTime: string;
    monthlyEnabled: boolean;
    monthlyDay: number;
    monthlyTime: string;
    retentionPolicy: IRetentionPolicy;
    lastModifiedBy: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const retentionPolicySchema = new Schema<IRetentionPolicy>(
    {
        daily: { type: Number, default: 1, min: 1, max: 30 },
        weekly: { type: Number, default: 1, min: 1, max: 12 },
        monthly: { type: Number, default: 1, min: 1, max: 12 },
    },
    { _id: false }
);

const backupSettingsSchema = new Schema<IBackupSettings>(
    {
        dailyEnabled: {
            type: Boolean,
            default: false,
        },
        dailyTime: {
            type: String,
            default: "02:00",
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        weeklyEnabled: {
            type: Boolean,
            default: false,
        },
        weeklyDay: {
            type: Number,
            default: 0, // Sunday
            min: 0,
            max: 6,
        },
        weeklyTime: {
            type: String,
            default: "03:00",
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        monthlyEnabled: {
            type: Boolean,
            default: false,
        },
        monthlyDay: {
            type: Number,
            default: 1,
            min: 1,
            max: 28,
        },
        monthlyTime: {
            type: String,
            default: "04:00",
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        retentionPolicy: {
            type: retentionPolicySchema,
            default: () => ({ daily: 1, weekly: 4, monthly: 3 }),
        },
        lastModifiedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

export const BackupSettings = mongoose.model<IBackupSettings>("BackupSettings", backupSettingsSchema);

/**
 * Get the singleton BackupSettings document (creates one with defaults if missing).
 */
export const getBackupSettings = async (): Promise<IBackupSettings> => {
    let settings = await BackupSettings.findOne();
    if (!settings) {
        settings = await BackupSettings.create({});
    }
    return settings;
};
