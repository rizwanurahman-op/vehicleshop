"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Car, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { loginSchema } from "@schemas/login";
import { useSessionStore } from "@stores/session";
import { setClientSession } from "@/lib/auth";
import Cookies from "js-cookie";

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const setSession = useSessionStore(s => s.setSession);

    const form = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: { usernameOrEmail: "", password: "" },
    });

    const onSubmit = async (values: LoginFormData) => {
        setIsLoading(true);
        const toastId = toast.loading("Signing in…", { description: "Please wait while we verify your credentials." });
        try {
            const res = await axios.post<ApiResponse<{ user: AuthSession; accessToken: string }>>("/auth/login", values);
            const { user, accessToken } = res.data.data!;
            setClientSession(accessToken);
            Cookies.set("vb_access_token", accessToken, { expires: 1 / 96, sameSite: "strict" });
            setSession(user, accessToken);
            toast.success("Welcome back!", { id: toastId, description: `Logged in as ${user.username}` });
            const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
            router.push(callbackUrl);
            router.refresh();
        } catch (error: unknown) {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Login failed", { id: toastId, description: errorData?.message || "Invalid credentials" });
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
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-foreground">Sign in</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to access the dashboard</p>
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="usernameOrEmail"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground">Username or Email</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                                                <User size={16} />
                                            </div>
                                            <Input
                                                placeholder="admin or admin@example.com"
                                                className="h-11 pl-9 bg-muted/50 border-border focus-visible:border-primary"
                                                autoComplete="username"
                                                {...field}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground">Password</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                                                <Lock size={16} />
                                            </div>
                                            <Input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="••••••••"
                                                className="h-11 pl-9 pr-10 bg-muted/50 border-border focus-visible:border-primary"
                                                autoComplete="current-password"
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

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="mt-2 h-11 w-full bg-gradient-brand cursor-pointer text-white shadow-md shadow-primary/30 hover:opacity-90 transition-opacity"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="mr-2 animate-spin" />
                                    Signing in…
                                </>
                            ) : (
                                "Sign in"
                            )}
                        </Button>
                    </form>
                </Form>

                <p className="mt-6 text-center text-xs text-muted-foreground">
                    VehicleBook © {new Date().getFullYear()} — Secure Vehicle Shop Management
                </p>
            </div>
        </div>
    );
};

export default LoginForm;
