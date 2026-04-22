import { z } from "zod";

const paymentModes = ["Cash", "Online", "Cheque", "UPI"] as const;

export const createInvestmentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    lender: z.string().min(1, "Lender is required"),
    amountReceived: z.number().positive("Amount must be positive"),
    mode: z.enum(paymentModes),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
});

export const updateInvestmentSchema = z.object({
    date: z.string().optional(),
    amountReceived: z.number().positive().optional(),
    mode: z.enum(paymentModes).optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
});

export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
