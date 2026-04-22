import mongoose, { Schema, Document } from "mongoose";

export interface ILender extends Document {
    lenderId: string;
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const lenderSchema = new Schema<ILender>(
    {
        lenderId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        remarks: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

lenderSchema.index({ name: 1 });
lenderSchema.index({ isActive: 1 });

export const Lender = mongoose.model<ILender>("Lender", lenderSchema);
