import { z } from "zod";

export const createLenderSchema = z.object({
    name: z.string().min(1, "Lender name is required").max(100),
    phone: z.string().optional().or(z.literal("")),
    address: z.string().optional().or(z.literal("")),
    remarks: z.string().optional().or(z.literal("")),
});

export const updateLenderSchema = createLenderSchema.partial().extend({
    isActive: z.boolean().optional(),
});

export type CreateLenderFormData = z.infer<typeof createLenderSchema>;
export type UpdateLenderFormData = z.infer<typeof updateLenderSchema>;
