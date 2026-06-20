import { z } from "zod";

// Reuse same password rules as auth.schema for consistency
const passwordSchema = z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number");

export const createViewerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(30)
        .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens, and underscores")
        .trim(),
    email: z.string().email("Invalid email address").trim(),
    password: passwordSchema,
});

export const updateUserSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(30)
        .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens, and underscores")
        .trim()
        .optional(),
    email: z.string().email("Invalid email address").trim().optional(),
    password: passwordSchema.optional().or(z.literal("")),
    role: z.enum(["admin", "viewer"]).optional(),
});

export type CreateViewerInput = z.infer<typeof createViewerSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

