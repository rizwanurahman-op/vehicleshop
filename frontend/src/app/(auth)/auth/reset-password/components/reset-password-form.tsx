"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, Car, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const resetPasswordSchema = z
    .object({
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine(data => data.newPassword === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

const ResetPasswordForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const form = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { newPassword: "", confirmPassword: "" },
    });

    const onSubmit = async (values: ResetPasswordFormData) => {
        if (!token) {
            toast.error("Invalid reset link", { description: "The reset token is missing. Please request a new one." });
            return;
        }
        setIsLoading(true);
        const toastId = toast.loading("Resetting password…", { description: "Please wait…" });
        try {
            await axios.post("/auth/reset-password", {
                token,
                newPassword: values.newPassword,
                confirmPassword: values.confirmPassword,
            });
            setIsSuccess(true);
            toast.success("Password reset!", {
                id: toastId,
                description: "Your password has been updated. You can now sign in.",
            });
            setTimeout(() => router.push("/auth/login"), 2500);
        } catch (error: unknown) {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Reset failed", {
                id: toastId,
                description: errorData?.message || "The link may have expired. Please request a new one.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    /* ── Invalid / Missing Token ── */
    if (!token) {
        return (
            <div className="w-full">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-lg shadow-primary/30">
                        <Car className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">VehicleBook</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Vehicle Shop Management System</p>
                </div>

                <div className={cn("rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-black/20 p-6 sm:p-8 text-center")}>
                    <div className="mb-4 flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-destructive/10 ring-2 ring-destructive/20">
                        <AlertCircle className="h-7 w-7 text-destructive" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Invalid Reset Link</h2>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        This password reset link is invalid or has already been used.
                        Please request a new one.
                    </p>
                    <div className="mt-6 space-y-3">
                        <Link href="/auth/forgot-password" className="block">
                            <Button className="w-full h-11 bg-gradient-brand text-white shadow-md shadow-primary/30 hover:opacity-90 transition-opacity">
                                Request a new link
                            </Button>
                        </Link>
                        <Link href="/auth/login" className="block">
                            <Button variant="ghost" className="w-full h-11 text-muted-foreground hover:text-foreground">
                                <ArrowLeft size={16} className="mr-2" />
                                Back to Sign in
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Logo */}
            <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-lg shadow-primary/30">
                    <Car className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">VehicleBook</h1>
                <p className="mt-1 text-sm text-muted-foreground">Vehicle Shop Management System</p>
            </div>

            {/* Card */}
            <div className={cn("rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-2xl shadow-black/20 p-6 sm:p-8")}>
                {isSuccess ? (
                    /* ── Success State ── */
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Password updated!</h2>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            Your password has been reset successfully.
                            <br />
                            Redirecting you to sign in…
                        </p>
                        <div className="mt-6 w-full">
                            <Link href="/auth/login" className="block">
                                <Button className="w-full h-11 bg-gradient-brand text-white shadow-md shadow-primary/30 hover:opacity-90 transition-opacity">
                                    Sign in now
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* ── Form State ── */
                    <>
                        <div className="mb-6 flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <KeyRound className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Set new password</h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Choose a strong password for your account.
                                </p>
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                {/* New Password */}
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">
                                                New password
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                                                        <Lock size={16} />
                                                    </div>
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        placeholder="Min. 8 characters"
                                                        className="h-11 pl-9 pr-10 bg-muted/50 border-border focus-visible:border-primary"
                                                        autoComplete="new-password"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(p => !p)}
                                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Confirm Password */}
                                <FormField
                                    control={form.control}
                                    name="confirmPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">
                                                Confirm password
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                                                        <Lock size={16} />
                                                    </div>
                                                    <Input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        placeholder="Re-enter your password"
                                                        className="h-11 pl-9 pr-10 bg-muted/50 border-border focus-visible:border-primary"
                                                        autoComplete="new-password"
                                                        {...field}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(p => !p)}
                                                        className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                        tabIndex={-1}
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Password hint */}
                                <p className="text-xs text-muted-foreground">
                                    Password must be at least <span className="font-medium text-foreground">8 characters</span> long.
                                </p>

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 h-11 w-full bg-gradient-brand cursor-pointer text-white shadow-md shadow-primary/30 hover:opacity-90 transition-opacity"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="mr-2 animate-spin" />
                                            Updating password…
                                        </>
                                    ) : (
                                        "Reset password"
                                    )}
                                </Button>
                            </form>
                        </Form>

                        <div className="mt-6 text-center">
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft size={14} />
                                Back to Sign in
                            </Link>
                        </div>
                    </>
                )}

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    VehicleBook © {new Date().getFullYear()} — Secure Vehicle Shop Management
                </p>
            </div>
        </div>
    );
};

export default ResetPasswordForm;
