"use client";

import { useState } from "react";
import apiClient from "@config/axios";
import { getErrorMessage } from "@/lib/formatApiErrors";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";

interface ApiResponse {
    message: string;
}

function PasswordField({
    id,
    label,
    value,
    onChange,
    placeholder,
    autoComplete,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    autoComplete: string;
}) {
    const [show, setShow] = useState(false);

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-medium text-foreground">
                {label}
            </label>
            <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                </span>
                <input
                    id={id}
                    type={show ? "text" : "password"}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    autoComplete={autoComplete}
                    className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    placeholder={placeholder}
                />
                <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShow(v => !v)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={show ? "Hide password" : "Show password"}
                >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}

export function PasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const passwordsMatch = newPassword === confirmPassword;
    const isValid =
        currentPassword.length > 0 &&
        newPassword.length >= 8 &&
        confirmPassword.length > 0 &&
        passwordsMatch;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setError(null);
        setSuccess(false);

        setLoading(true);
        try {
            await apiClient.patch<ApiResponse>("/auth/password", {
                currentPassword,
                newPassword,
                confirmPassword,
            });
            setSuccess(true);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setTimeout(() => setSuccess(false), 5000);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const newPasswordStrength = (() => {
        if (newPassword.length === 0) return null;
        if (newPassword.length < 8) return { label: "Too short", color: "bg-destructive", width: "w-1/4" };
        if (newPassword.length < 12) return { label: "Weak", color: "bg-warning", width: "w-2/4" };
        if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword))
            return { label: "Fair", color: "bg-info", width: "w-3/4" };
        return { label: "Strong", color: "bg-success", width: "w-full" };
    })();

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordField
                id="settings-current-password"
                label="Current password"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter your current password"
                autoComplete="current-password"
            />

            <PasswordField
                id="settings-new-password"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
            />

            {/* Password strength bar */}
            {newPasswordStrength && (
                <div className="space-y-1.5 -mt-2">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${newPasswordStrength.color} ${newPasswordStrength.width}`}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Password strength:{" "}
                        <span
                            className={
                                newPasswordStrength.label === "Strong"
                                    ? "text-success font-medium"
                                    : newPasswordStrength.label === "Fair"
                                    ? "text-info font-medium"
                                    : newPasswordStrength.label === "Weak"
                                    ? "text-warning font-medium"
                                    : "text-destructive font-medium"
                            }
                        >
                            {newPasswordStrength.label}
                        </span>
                    </p>
                </div>
            )}

            <PasswordField
                id="settings-confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Re-enter new password"
                autoComplete="new-password"
            />

            {/* Mismatch warning */}
            {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive -mt-2">Passwords do not match</p>
            )}

            {/* Feedback */}
            {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}
            {success && (
                <div className="flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/10 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <p className="text-sm text-success">Password changed successfully! Please use your new password next time you log in.</p>
                </div>
            )}

            {/* Submit */}
            <button
                id="settings-change-password"
                type="submit"
                disabled={loading || !isValid}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Changing…
                    </>
                ) : (
                    <>
                        <Shield className="h-4 w-4" />
                        Change password
                    </>
                )}
            </button>
        </form>
    );
}
