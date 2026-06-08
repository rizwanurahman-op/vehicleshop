"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, Car, CheckCircle2, Loader2, Mail } from "lucide-react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const forgotPasswordSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordForm = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [sentToEmail, setSentToEmail] = useState("");

    const form = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = async (values: ForgotPasswordFormData) => {
        setIsLoading(true);
        const toastId = toast.loading("Sending reset link…", {
            description: "Please wait while we process your request.",
        });
        try {
            await axios.post("/auth/forgot-password", { email: values.email });
            setSentToEmail(values.email);
            setEmailSent(true);
            toast.success("Reset link sent!", {
                id: toastId,
                description: "Check your inbox for the password reset email.",
            });
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            const status = axiosError?.response?.status;
            const errorData = axiosError?.response?.data as ErrorData;

            toast.dismiss(toastId);

            if (status === 404) {
                // Email not registered — show inline under the field
                form.setError("email", {
                    type: "manual",
                    message: "No account found with this email address.",
                });
            } else if (status === 429) {
                form.setError("email", {
                    type: "manual",
                    message: "Too many attempts. Please wait 15 minutes and try again.",
                });
            } else {
                toast.error("Something went wrong", {
                    description: errorData?.message || "Please try again later.",
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

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
                {emailSent ? (
                    /* ── Success State ── */
                    <div className="flex flex-col items-center text-center">
                        {/* Animated check icon */}
                        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-500/30">
                            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        </div>

                        <h2 className="text-xl font-bold text-foreground">Check your inbox</h2>
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                            We&apos;ve sent a password reset link to
                        </p>
                        <p className="mt-1 text-sm font-semibold text-primary break-all">
                            {sentToEmail}
                        </p>
                        <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
                            The link will expire in <span className="font-medium text-foreground">1 hour</span>.
                            If you don&apos;t see the email, check your spam folder.
                        </p>

                        <div className="mt-6 w-full space-y-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full h-11 border-border"
                                onClick={() => {
                                    setEmailSent(false);
                                    setSentToEmail("");
                                    form.reset();
                                }}
                            >
                                <Mail size={16} className="mr-2" />
                                Try a different email
                            </Button>

                            <Link href="/auth/login" className="block">
                                <Button
                                    type="button"
                                    className="w-full h-11 bg-gradient-brand text-white shadow-md shadow-primary/30 hover:opacity-90 transition-opacity"
                                >
                                    <ArrowLeft size={16} className="mr-2" />
                                    Back to Sign in
                                </Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* ── Email Input State ── */
                    <>
                        {/* Icon + heading */}
                        <div className="mb-6 flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                                <Mail className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Forgot password?</h2>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    Enter your email and we&apos;ll send you a reset link.
                                </p>
                            </div>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field, fieldState }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground">
                                                Email address
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className={cn(
                                                        "absolute top-1/2 left-3 -translate-y-1/2",
                                                        fieldState.error ? "text-destructive" : "text-muted-foreground"
                                                    )}>
                                                        <Mail size={16} />
                                                    </div>
                                                    <Input
                                                        type="email"
                                                        placeholder="you@example.com"
                                                        className={cn(
                                                            "h-11 pl-9 bg-muted/50 border-border focus-visible:border-primary",
                                                            fieldState.error && "border-destructive focus-visible:border-destructive"
                                                        )}
                                                        autoComplete="email"
                                                        autoFocus
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <Button
                                    type="submit"
                                    disabled={isLoading}
                                    className="mt-2 h-11 w-full bg-gradient-brand cursor-pointer text-white shadow-md shadow-primary/30 hover:opacity-90 transition-opacity"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={18} className="mr-2 animate-spin" />
                                            Sending reset link…
                                        </>
                                    ) : (
                                        "Send reset link"
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

export default ForgotPasswordForm;
