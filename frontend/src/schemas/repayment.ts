import { z } from "zod";

const paymentModes = ["Cash", "Online", "Cheque", "UPI"] as const;

export const createRepaymentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    lender: z.string().min(1, "Lender is required"),
    amountPaid: z.number({ message: "Amount is required" }).positive("Amount must be positive"),
    mode: z.enum(paymentModes, { message: "Payment mode is required" }),
    referenceNo: z.string().optional().or(z.literal("")),
    remarks: z.string().optional().or(z.literal("")),
});

export const updateRepaymentSchema = createRepaymentSchema.partial();

export type CreateRepaymentFormData = z.infer<typeof createRepaymentSchema>;
export type UpdateRepaymentFormData = z.infer<typeof updateRepaymentSchema>;
