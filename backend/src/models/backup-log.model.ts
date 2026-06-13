import mongoose, { Schema, Document } from "mongoose";

export interface ICollectionCounts {
    lenders: number;
    investments: number;
    repayments: number;
    vehicles: number;
    consignments: number;
    vehicleOwners: number;
    users: number;
    counters: number;
}

export interface IBackupLog extends Document {
    backupId: string;
    schedule: "manual" | "daily" | "weekly" | "monthly";
    status: "in_progress" | "completed" | "failed";
    fileName: string;
    localPath: string | null;
    telegramMessageId: number | null;
    telegramLink: string | null;
    fileSize: number;
    checksum: string | null;          // SHA-256 hash of the ZIP for integrity
    isPasswordProtected: boolean;     // true if ZIP was created with a password
    collections: ICollectionCounts;
    totalRecords: number;
    error: string | null;
    startedAt: Date;
    completedAt: Date | null;
    createdBy: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const collectionCountsSchema = new Schema<ICollectionCounts>(
    {
        lenders: { type: Number, default: 0 },
        investments: { type: Number, default: 0 },
        repayments: { type: Number, default: 0 },
        vehicles: { type: Number, default: 0 },
        consignments: { type: Number, default: 0 },
        vehicleOwners: { type: Number, default: 0 },
        users: { type: Number, default: 0 },
        counters: { type: Number, default: 0 },
    },
    { _id: false }
);

const backupLogSchema = new Schema<IBackupLog>(
    {
        backupId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        schedule: {
            type: String,
            enum: ["manual", "daily", "weekly", "monthly"],
            required: true,
        },
        status: {
            type: String,
            enum: ["in_progress", "completed", "failed"],
            default: "in_progress",
        },
        fileName: {
            type: String,
            required: true,
        },
        localPath: {
            type: String,
            default: null,
        },
        telegramMessageId: {
            type: Number,
            default: null,
        },
        telegramLink: {
            type: String,
            default: null,
        },
        fileSize: {
            type: Number,
            default: 0,
        },
        checksum: {
            type: String,
            default: null,
        },
        isPasswordProtected: {
            type: Boolean,
            default: false,
        },
        collections: {
            type: collectionCountsSchema,
            default: () => ({
                lenders: 0,
                investments: 0,
                repayments: 0,
                vehicles: 0,
                consignments: 0,
                vehicleOwners: 0,
                users: 0,
                counters: 0,
            }),
        },
        totalRecords: {
            type: Number,
            default: 0,
        },
        error: {
            type: String,
            default: null,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        completedAt: {
            type: Date,
            default: null,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    { timestamps: true }
);

backupLogSchema.index({ schedule: 1, status: 1 });
backupLogSchema.index({ startedAt: -1 });

export const BackupLog = mongoose.model<IBackupLog>("BackupLog", backupLogSchema);
