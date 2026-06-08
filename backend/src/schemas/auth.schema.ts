import { z } from "zod";

export const registerSchema = z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
    usernameOrEmail: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z
    .object({
        username: z.string().min(3, "Username must be at least 3 characters").max(30).optional(),
        email: z.string().email("Invalid email address").optional(),
    })
    .refine(data => data.username !== undefined || data.email !== undefined, {
        message: "At least one field (username or email) must be provided",
    });

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "New password must be at least 8 characters"),
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

export const resetPasswordSchema = z
    .object({
        token: z.string().min(1, "Reset token is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

