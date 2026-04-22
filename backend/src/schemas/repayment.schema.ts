import { z } from "zod";

const paymentModes = ["Cash", "Online", "Cheque", "UPI"] as const;

export const createRepaymentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    lender: z.string().min(1, "Lender is required"),
    amountPaid: z.number().positive("Amount must be positive"),
    mode: z.enum(paymentModes),
    referenceNo: z.string().optional(),
    remarks: z.string().optional(),
});

export const updateRepaymentSchema = z.object({
    date: z.string().optional(),
    amountPaid: z.number().positive().optional(),
    mode: z.enum(paymentModes).optional(),
    referenceNo: z.string().optional(),
    remarks: z.string().optional(),
});

export type CreateRepaymentInput = z.infer<typeof createRepaymentSchema>;
export type UpdateRepaymentInput = z.infer<typeof updateRepaymentSchema>;
