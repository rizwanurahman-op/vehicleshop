"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@config/axios";
import { getErrorMessage } from "@/lib/formatApiErrors";
import {
    UserPlus, Trash2, Eye, EyeOff, Loader2, Shield,
    ShieldCheck, ShieldAlert, Mail, User, Lock,
    AlertCircle, Users, Calendar, MoreHorizontal,
    RefreshCw, Search, X, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminOnly, ViewerGuard } from "@components/shared";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AppUser {
    _id: string;
    username: string;
    email: string;
    role: "admin" | "viewer";
    createdAt: string;
}

// ── Password strength ─────────────────────────────────────────────────────────
const getStrength = (pw: string) => {
    let score = 0;
    if (pw.length >= 8)            score++;
    if (/[A-Z]/.test(pw))          score++;
    if (/[0-9]/.test(pw))          score++;
    if (/[^A-Za-z0-9]/.test(pw))   score++;
    return score;
};
const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "bg-red-500", "bg-amber-500", "bg-sky-500", "bg-emerald-500"];
const STRENGTH_TEXT  = ["", "text-red-500", "text-amber-500", "text-sky-500", "text-emerald-500"];

// ── Role badge ────────────────────────────────────────────────────────────────
const RoleBadge = ({ role }: { role: "admin" | "viewer" }) =>
    role === "admin" ? (
        <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            <ShieldCheck className="h-3 w-3" /> Admin
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-bold text-violet-500">
            <ShieldAlert className="h-3 w-3" /> Viewer
        </span>
    );

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────
const DeleteDialog = ({
    user,
    open,
    onOpenChange,
    onConfirm,
    isLoading,
}: {
    user: AppUser | null;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: () => void;
    isLoading: boolean;
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                    <Trash2 className="h-5 w-5" /> Delete User
                </DialogTitle>
                <DialogDescription>
                    This will permanently delete{" "}
                    <span className="font-semibold text-foreground">@{user?.username}</span>.
                    They will lose all access immediately. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                    Cancel
                </Button>
                <Button variant="destructive" onClick={onConfirm} disabled={isLoading} id="confirm-delete-user">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</> : "Delete User"}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

// ── Create Viewer Dialog ──────────────────────────────────────────────────────
const CreateViewerDialog = ({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) => {
    const queryClient = useQueryClient();
    const [username, setUsername] = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw]     = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const strength = getStrength(password);

    const mutation = useMutation({
        mutationFn: (p: { username: string; email: string; password: string }) =>
            apiClient.post("/users", p),
        onSuccess: () => {
            toast.success("Viewer account created!", {
                description: "The user can log in with read-only access.",
            });
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setUsername(""); setEmail(""); setPassword(""); setFormError(null);
            onOpenChange(false);
        },
        onError: (err) => setFormError(getErrorMessage(err)),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        if (!username.trim() || !email.trim() || !password) {
            setFormError("All fields are required");
            return;
        }
        mutation.mutate({ username: username.trim(), email: email.trim(), password });
    };

    const handleClose = (v: boolean) => {
        if (!mutation.isPending) {
            setUsername(""); setEmail(""); setPassword(""); setFormError(null);
            onOpenChange(v);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                            <UserPlus className="h-4 w-4 text-violet-500" />
                        </div>
                        Create Viewer Account
                    </DialogTitle>
                    <DialogDescription>
                        Viewer accounts have <strong>read-only access</strong> — they can browse all data but cannot add, edit, or delete anything.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                    {/* Username */}
                    <div className="space-y-1.5">
                        <label htmlFor="cv-username" className="text-sm font-medium text-foreground">Username</label>
                        <div className="relative">
                            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input id="cv-username" value={username} onChange={e => setUsername(e.target.value)}
                                placeholder="viewer_username" autoComplete="off" className="pl-9" />
                        </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label htmlFor="cv-email" className="text-sm font-medium text-foreground">Email</label>
                        <div className="relative">
                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input id="cv-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                placeholder="viewer@example.com" autoComplete="off" className="pl-9" />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label htmlFor="cv-password" className="text-sm font-medium text-foreground">Password</label>
                        <div className="relative">
                            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input id="cv-password" type={showPw ? "text" : "password"} value={password}
                                onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                                autoComplete="new-password" className="pl-9 pr-10" />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {password && (
                            <div className="space-y-1">
                                <div className="flex gap-1">
                                    {[1,2,3,4].map(s => (
                                        <div key={s} className={cn("h-1.5 flex-1 rounded-full transition-all",
                                            strength >= s ? STRENGTH_COLOR[strength] : "bg-muted")} />
                                    ))}
                                </div>
                                <p className={cn("text-xs font-medium", STRENGTH_TEXT[strength])}>
                                    {STRENGTH_LABEL[strength]}
                                </p>
                            </div>
                        )}
                    </div>

                    {formError && (
                        <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                            <p className="text-sm text-destructive">{formError}</p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 pt-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => handleClose(false)} disabled={mutation.isPending}>
                            Cancel
                        </Button>
                        <Button type="submit" id="create-viewer-submit"
                            disabled={mutation.isPending}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
                            {mutation.isPending
                                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating…</>
                                : <><UserPlus className="mr-2 h-4 w-4" />Create Account</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

// ── Avatar initials ───────────────────────────────────────────────────────────
const Avatar = ({ name, role }: { name: string; role: "admin" | "viewer" }) => (
    <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        role === "admin"
            ? "bg-primary/10 text-primary"
            : "bg-violet-500/10 text-violet-500"
    )}>
        {name.charAt(0).toUpperCase()}
    </div>
);

// ── Main Page ─────────────────────────────────────────────────────────────────
export function UsersPageClient() {
    const queryClient = useQueryClient();
    const [search, setSearch]         = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);

    // Fetch users
    const { data: users = [], isLoading, isFetching } = useQuery<AppUser[]>({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await apiClient.get<{ data: AppUser[] }>("/users");
            return res.data.data ?? [];
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: (id: string) => apiClient.delete(`/users/${id}`),
        onSuccess: () => {
            toast.success("User deleted");
            queryClient.invalidateQueries({ queryKey: ["users"] });
            setDeleteTarget(null);
        },
        onError: (err) => {
            toast.error(getErrorMessage(err));
            setDeleteTarget(null);
        },
    });

    // Filtered
    const filtered = users.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const adminCount  = users.filter(u => u.role === "admin").length;
    const viewerCount = users.filter(u => u.role === "viewer").length;

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    return (
        <>
            {/* Redirect viewers */}
            <ViewerGuard redirectTo="/dashboard" />

            <div className="space-y-6">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                            <p className="text-sm text-muted-foreground">Manage access and viewer accounts</p>
                        </div>
                    </div>
                    <AdminOnly>
                        <Button
                            id="open-create-viewer"
                            onClick={() => setCreateOpen(true)}
                            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90 shadow-md"
                        >
                            <UserPlus className="mr-2 h-4 w-4" /> Add Viewer
                        </Button>
                    </AdminOnly>
                </div>

                {/* ── Stat Cards ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Total */}
                    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Total Users</p>
                            <p className="text-2xl font-bold text-foreground">{users.length}</p>
                        </div>
                    </div>
                    {/* Admins */}
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-primary/70">Admins</p>
                            <p className="text-2xl font-bold text-primary">{adminCount}</p>
                        </div>
                    </div>
                    {/* Viewers */}
                    <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4 flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
                            <ShieldAlert className="h-5 w-5 text-violet-500" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-violet-500/70">Viewers</p>
                            <p className="text-2xl font-bold text-violet-500">{viewerCount}</p>
                        </div>
                    </div>
                </div>

                {/* ── Table Card ───────────────────────────────────────────── */}
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 bg-muted/20">
                        <div className="relative w-full max-w-xs">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="users-search"
                                placeholder="Search users…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9 bg-background text-sm"
                            />
                            {search && (
                                <button onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            title="Refresh"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>

                    {/* Table */}
                    {isLoading ? (
                        <div className="space-y-0">
                            {[1,2,3].map(i => (
                                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-border last:border-0">
                                    <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 w-32 animate-pulse rounded bg-muted" />
                                        <div className="h-3 w-44 animate-pulse rounded bg-muted" />
                                    </div>
                                    <div className="h-5 w-16 animate-pulse rounded-md bg-muted" />
                                    <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                                <Users className="h-7 w-7 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">
                                {search ? "No users match your search" : "No users found"}
                            </p>
                            {!search && (
                                <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
                                    <UserPlus className="mr-2 h-4 w-4" /> Create First Viewer
                                </Button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent bg-muted/10">
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground w-10 pl-5">#</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">User</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Role</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Joined</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground text-right pr-5">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filtered.map((user, idx) => (
                                            <TableRow
                                                key={user._id}
                                                className="border-border hover:bg-muted/40 transition-colors group"
                                            >
                                                <TableCell className="pl-5 text-xs text-muted-foreground font-mono">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={user.username} role={user.role} />
                                                        <div>
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {user.username}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                                        {user.email}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <RoleBadge role={user.role} />
                                                </TableCell>
                                                <TableCell>
                                                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                                                        {fmtDate(user.createdAt)}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right pr-5">
                                                    {user.role !== "admin" ? (
                                                        <AdminOnly>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        id={`user-actions-${user._id}`}
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-40">
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeleteTarget(user)}
                                                                        className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                                                                        id={`delete-user-${user._id}`}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                        Delete user
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </AdminOnly>
                                                    ) : (
                                                        <span className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground/50 pr-2">
                                                            <Shield className="h-3 w-3" /> Protected
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Mobile Cards */}
                            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
                                {filtered.map((user) => (
                                    <div
                                        key={user._id}
                                        className="group relative flex items-center gap-3 rounded-xl border border-border bg-gradient-to-r from-card to-muted/10 p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                                    >
                                        {/* Left accent */}
                                        <div className={cn(
                                            "absolute left-0 top-0 bottom-0 w-0.5 rounded-l-xl",
                                            user.role === "admin" ? "bg-primary" : "bg-violet-500"
                                        )} />

                                        <Avatar name={user.username} role={user.role} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
                                                <RoleBadge role={user.role} />
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
                                            <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                                                Joined {fmtDate(user.createdAt)}
                                            </p>
                                        </div>

                                        {user.role !== "admin" && (
                                            <AdminOnly>
                                                <button
                                                    onClick={() => setDeleteTarget(user)}
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </AdminOnly>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Table footer */}
                    {!isLoading && filtered.length > 0 && (
                        <div className="flex items-center justify-between border-t border-border px-5 py-3 bg-muted/10">
                            <p className="text-xs text-muted-foreground">
                                Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
                                <span className="font-medium text-foreground">{users.length}</span> users
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                                All users are live
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Info Note ─────────────────────────────────────────────── */}
                <div className="flex items-start gap-3 rounded-xl border border-violet-500/15 bg-violet-500/5 px-4 py-3">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                    <div className="text-xs text-violet-600 dark:text-violet-400 space-y-0.5">
                        <p className="font-semibold">About viewer accounts</p>
                        <p className="text-violet-600/80 dark:text-violet-400/80">
                            Viewer accounts have read-only access. They can see all data but cannot add, edit, or delete anything.
                            All write operations are blocked at both the UI and API level.
                        </p>
                    </div>
                </div>

            </div>

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            <CreateViewerDialog open={createOpen} onOpenChange={setCreateOpen} />
            <DeleteDialog
                user={deleteTarget}
                open={!!deleteTarget}
                onOpenChange={v => !v && setDeleteTarget(null)}
                onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
                isLoading={deleteMutation.isPending}
            />
        </>
    );
}
