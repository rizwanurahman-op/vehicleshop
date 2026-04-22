import { z } from "zod";

export const createLenderSchema = z.object({
    name: z.string().min(1, "Lender name is required").max(100),
    phone: z.string().optional(),
    address: z.string().optional(),
    remarks: z.string().optional(),
});

export const updateLenderSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    remarks: z.string().optional(),
    isActive: z.boolean().optional(),
});

export type CreateLenderInput = z.infer<typeof createLenderSchema>;
export type UpdateLenderInput = z.infer<typeof updateLenderSchema>;
