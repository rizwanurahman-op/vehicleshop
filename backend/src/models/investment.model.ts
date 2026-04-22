import mongoose, { Schema, Document } from "mongoose";

export type PaymentMode = "Cash" | "Online" | "Cheque" | "UPI";

export interface IInvestment extends Document {
    investmentId: string;
    date: Date;
    lender: mongoose.Types.ObjectId;
    amountReceived: number;
    mode: PaymentMode;
    referenceNo?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const investmentSchema = new Schema<IInvestment>(
    {
        investmentId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
        },
        lender: {
            type: Schema.Types.ObjectId,
            ref: "Lender",
            required: true,
            index: true,
        },
        amountReceived: {
            type: Number,
            required: true,
            min: 0,
        },
        mode: {
            type: String,
            enum: ["Cash", "Online", "Cheque", "UPI"],
            required: true,
        },
        referenceNo: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

investmentSchema.index({ lender: 1, date: -1 });
investmentSchema.index({ date: -1 });

export const Investment = mongoose.model<IInvestment>("Investment", investmentSchema);
