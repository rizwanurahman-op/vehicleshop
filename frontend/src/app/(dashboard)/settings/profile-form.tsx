"use client";

import { useState, useEffect } from "react";
import { useSessionStore } from "@stores/session";
import apiClient from "@config/axios";
import { getErrorMessage } from "@/lib/formatApiErrors";
import { User, Mail, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";

interface ApiResponse<T> {
    data: T;
    message: string;
}

interface UpdatedUser {
    id: string;
    username: string;
    email: string;
    role: "admin" | "viewer";
}

export function ProfileForm() {
    const { user, updateUser } = useSessionStore();

    // Zustand persist hydrates from localStorage AFTER first render,
    // so useState initial value would be "" (user is null on first paint).
    // useEffect re-syncs the fields once the store is hydrated.
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [hydrated, setHydrated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user && !hydrated) {
            setUsername(user.username ?? "");
            setEmail(user.email ?? "");
            setHydrated(true);
        }
    }, [user, hydrated]);

    const isDirty = username !== (user?.username ?? "") || email !== (user?.email ?? "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        const payload: { username?: string; email?: string } = {};
        if (username !== user?.username) payload.username = username;
        if (email !== user?.email) payload.email = email;

        if (Object.keys(payload).length === 0) return;

        setLoading(true);
        try {
            const res = await apiClient.patch<ApiResponse<{ user: UpdatedUser }>>("/auth/profile", payload);
            const updated = res.data.data.user;
            updateUser({ username: updated.username, email: updated.email });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Skeleton while hydrating */}
            {!hydrated && (
                <div className="space-y-5 animate-pulse">
                    <div className="space-y-1.5">
                        <div className="h-4 w-20 rounded bg-muted" />
                        <div className="h-10 w-full rounded-lg bg-muted" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-4 w-28 rounded bg-muted" />
                        <div className="h-10 w-full rounded-lg bg-muted" />
                    </div>
                    <div className="h-10 w-full rounded-lg bg-muted" />
                </div>
            )}

            {/* Username field */}
            <div className={`space-y-1.5 ${!hydrated ? "hidden" : ""}`}>
                <label htmlFor="settings-username" className="block text-sm font-medium text-foreground">
                    Username
                </label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <input
                        id="settings-username"
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        minLength={3}
                        maxLength={30}
                        autoComplete="username"
                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        placeholder="Enter username"
                    />
                </div>
            </div>

            {/* Email field */}
            <div className={`space-y-1.5 ${!hydrated ? "hidden" : ""}`}>
                <label htmlFor="settings-email" className="block text-sm font-medium text-foreground">
                    Email address
                </label>
                <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                    </span>
                    <input
                        id="settings-email"
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                        className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        placeholder="Enter email"
                    />
                </div>
            </div>

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
                    <p className="text-sm text-success">Profile updated successfully!</p>
                </div>
            )}

            {/* Submit */}
            <button
                id="settings-save-profile"
                type="submit"
                disabled={loading || !isDirty || !hydrated}
                className={`flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 ${!hydrated ? "hidden" : ""}`}
            >
                {loading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving…
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4" />
                        Save changes
                    </>
                )}
            </button>
        </form>
    );
}
