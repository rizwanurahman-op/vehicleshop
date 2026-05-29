import { z } from "zod";

export const createViewerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(30).trim(),
    email: z.string().email("Invalid email address").trim(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export type CreateViewerInput = z.infer<typeof createViewerSchema>;
