import mongoose, { Schema, Document } from "mongoose";

export type PaymentMode = "Cash" | "Online" | "Cheque" | "UPI";
export type RepaymentType = "Principal" | "Profit";

export interface IRepayment extends Document {
    repaymentId: string;
    date: Date;
    lender: mongoose.Types.ObjectId;
    amountPaid: number;
    mode: PaymentMode;
    /** Principal → reduces the outstanding balance. Profit → interest/profit paid, balance unchanged. */
    repaymentType: RepaymentType;
    referenceNo?: string;
    remarks?: string;
    createdAt: Date;
    updatedAt: Date;
}

const repaymentSchema = new Schema<IRepayment>(
    {
        repaymentId: {
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
        amountPaid: {
            type: Number,
            required: true,
            min: 0,
        },
        mode: {
            type: String,
            enum: ["Cash", "Online", "Cheque", "UPI"],
            required: true,
        },
        repaymentType: {
            type: String,
            enum: ["Principal", "Profit"],
            default: "Principal", // existing records = Principal (no migration needed)
            index: true,
        },
        referenceNo: {
            type: String,
            trim: true,
        },
        remarks: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true }
);

repaymentSchema.index({ lender: 1, date: -1 });
repaymentSchema.index({ date: -1 });

export const Repayment = mongoose.model<IRepayment>("Repayment", repaymentSchema);
