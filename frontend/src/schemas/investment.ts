import { z } from "zod";

const paymentModes = ["Cash", "Online", "Cheque", "UPI"] as const;

export const createInvestmentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    lender: z.string().min(1, "Lender is required"),
    amountReceived: z.number({ message: "Amount is required" }).positive("Amount must be positive"),
    mode: z.enum(paymentModes, { message: "Payment mode is required" }),
    referenceNo: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
});

export const updateInvestmentSchema = createInvestmentSchema.partial();

export type CreateInvestmentFormData = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentFormData = z.infer<typeof updateInvestmentSchema>;
