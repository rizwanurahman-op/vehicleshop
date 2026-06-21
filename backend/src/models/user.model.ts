import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
    username: string;
    email: string;
    passwordHash: string;
    role: "admin" | "viewer";
    refreshToken: string | null;
    /**
     * Refresh token family ID (UUID).
     * All tokens in the same rotation chain share this family.
     * If an old (already-rotated) refresh token is presented, the family
     * mismatch triggers a full session wipe — reuse detected.
     */
    refreshTokenFamily: string | null;
    passwordResetToken: string | null;
    passwordResetExpires: Date | null;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 30,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false, // Never returned by default — must be explicitly requested
        },
        role: {
            type: String,
            enum: ["admin", "viewer"],
            default: "admin",
        },
        refreshToken: {
            type: String,
            default: null,
            select: false, // Never returned by default — sensitive session credential
        },
        refreshTokenFamily: {
            type: String,
            default: null,
            select: false, // Never returned by default
        },
        passwordResetToken: {
            type: String,
            default: null,
            index: true, // Sparse index for fast token lookup during password reset
            select: false, // Never returned by default
        },
        passwordResetExpires: {
            type: Date,
            default: null,
            select: false,
        },
    },
    { timestamps: true }
);

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>("User", userSchema);

