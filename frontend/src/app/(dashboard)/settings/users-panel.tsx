"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@config/axios";
import { getErrorMessage } from "@/lib/formatApiErrors";
import {
    UserPlus, Trash2, Eye, EyeOff, Loader2,
    ShieldCheck, ShieldAlert, Mail, User, Lock,
    AlertCircle, Users, Calendar,
} from "lucide-react";
import { toast } from "sonner";

interface ViewerUser {
    _id: string;
    username: string;
    email: string;
    role: "admin" | "viewer";
    createdAt: string;
}

interface ApiResponse<T> {
    data: T;
    message: string;
}

// ── Password strength helper ──────────────────────────────────────────────────
const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8)  score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0..4
};

const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];

// ── User Row ──────────────────────────────────────────────────────────────────
const UserRow = ({
    user,
    onDelete,
    isDeleting,
}: {
    user: ViewerUser;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}) => {
    const isAdmin = user.role === "admin";
    const joined = new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
    });

    return (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 hover:bg-muted/40 transition-colors group">
            {/* Avatar */}
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isAdmin
                    ? "bg-primary/10 text-primary"
                    : "bg-violet-500/10 text-violet-500"
            }`}>
                {user.username.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{user.username}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isAdmin
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "bg-violet-500/10 text-violet-500 border border-violet-500/20"
                    }`}>
                        {isAdmin
                            ? <><ShieldCheck className="h-2.5 w-2.5" /> Admin</>
                            : <><ShieldAlert className="h-2.5 w-2.5" /> Viewer</>
                        }
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />{user.email}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />Joined {joined}
                    </span>
                </div>
            </div>

            {/* Delete (only for viewer accounts) */}
            {!isAdmin && (
                <button
                    id={`delete-user-${user._id}`}
                    onClick={() => onDelete(user._id)}
                    disabled={isDeleting}
                    className="opacity-0 group-hover:opacity-100 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all disabled:pointer-events-none"
                    title="Delete user"
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
            )}
        </div>
    );
};

// ── Main UsersPanel ───────────────────────────────────────────────────────────
export function UsersPanel() {
    const queryClient = useQueryClient();

    // Form state
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const strength = getStrength(password);

    // Fetch users
    const { data: users, isLoading } = useQuery<ViewerUser[]>({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await apiClient.get<ApiResponse<ViewerUser[]>>("/users");
            return res.data.data ?? [];
        },
    });

    // Create viewer mutation
    const createMutation = useMutation({
        mutationFn: (payload: { username: string; email: string; password: string }) =>
            apiClient.post("/users", payload),
        onSuccess: () => {
            toast.success("Viewer account created!", {
                description: "The user can now log in with view-only access.",
            });
            setUsername(""); setEmail(""); setPassword(""); setFormError(null);
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => {
            setFormError(getErrorMessage(err));
        },
    });

    // Delete viewer mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
        onSuccess: () => {
            toast.success("User deleted successfully");
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err) => toast.error(getErrorMessage(err)),
        onSettled: () => setDeletingId(null),
    });

    const handleDelete = (id: string) => {
        setDeletingId(id);
        deleteMutation.mutate(id);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!username.trim() || !email.trim() || !password) {
            setFormError("All fields are required");
            return;
        }
        createMutation.mutate({ username: username.trim(), email: email.trim(), password });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md">
                    <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-foreground">User Management</h2>
                    <p className="text-xs text-muted-foreground">Create viewer accounts with read-only access</p>
                </div>
            </div>

            {/* User List */}
            <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    All Users ({users?.length ?? 0})
                </p>

                {isLoading ? (
                    <div className="space-y-2">
                        {[1, 2].map(i => (
                            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40 border border-border/50" />
                        ))}
                    </div>
                ) : !users?.length ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 rounded-xl border border-dashed border-border">
                        <Users className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">No users yet</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {users.map(u => (
                            <UserRow
                                key={u._id}
                                user={u}
                                onDelete={handleDelete}
                                isDeleting={deletingId === u._id}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Divider */}
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-xs text-muted-foreground font-medium">Create Viewer Account</span>
                </div>
            </div>

            {/* Create Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                    <label htmlFor="new-viewer-username" className="block text-sm font-medium text-foreground">
                        Username
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <input
                            id="new-viewer-username"
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            minLength={3}
                            maxLength={30}
                            autoComplete="off"
                            placeholder="viewer_username"
                            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                    </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                    <label htmlFor="new-viewer-email" className="block text-sm font-medium text-foreground">
                        Email address
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <input
                            id="new-viewer-email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="off"
                            placeholder="viewer@example.com"
                            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                    </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                    <label htmlFor="new-viewer-password" className="block text-sm font-medium text-foreground">
                        Password
                    </label>
                    <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <input
                            id="new-viewer-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            minLength={8}
                            autoComplete="new-password"
                            placeholder="Min. 8 characters"
                            className="w-full rounded-lg border border-border bg-background py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>

                    {/* Strength bar */}
                    {password && (
                        <div className="space-y-1">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4].map(s => (
                                    <div
                                        key={s}
                                        className={`h-1.5 flex-1 rounded-full transition-all ${
                                            strength >= s ? strengthColor[strength] : "bg-muted"
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className={`text-xs font-medium ${
                                strength <= 1 ? "text-red-500"
                                    : strength === 2 ? "text-amber-500"
                                    : strength === 3 ? "text-sky-500"
                                    : "text-emerald-500"
                            }`}>
                                {strengthLabel[strength]}
                            </p>
                        </div>
                    )}
                </div>

                {/* Info note */}
                <div className="flex items-start gap-2 rounded-lg border border-violet-500/20 bg-violet-500/5 px-3 py-2.5">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                    <p className="text-xs text-violet-600 dark:text-violet-400">
                        This account will have <strong>view-only access</strong> — they can see all data but cannot add, edit, or delete anything.
                    </p>
                </div>

                {/* Error */}
                {formError && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm text-destructive">{formError}</p>
                    </div>
                )}

                {/* Submit */}
                <button
                    id="create-viewer-submit"
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {createMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Creating account…</>
                    ) : (
                        <><UserPlus className="h-4 w-4" /> Create Viewer Account</>
                    )}
                </button>
            </form>
        </div>
    );
}
