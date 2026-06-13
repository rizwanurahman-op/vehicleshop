"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { toast } from "sonner";
import {
    Loader2, CheckCircle2, XCircle, Trash2, Send,
    ChevronDown, ChevronRight, FileArchive, Calendar, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CollectionCounts {
    lenders: number;
    investments: number;
    repayments: number;
    vehicles: number;
    consignments: number;
    vehicleOwners: number;
    users: number;
    counters: number;
}

interface BackupRecord {
    _id: string;
    backupId: string;
    schedule: "manual" | "daily" | "weekly" | "monthly";
    status: "in_progress" | "completed" | "failed";
    fileName: string;
    telegramMessageId: number | null;
    telegramLink: string | null;
    fileSize: number;
    checksum: string | null;
    isPasswordProtected: boolean;
    collections: CollectionCounts;
    totalRecords: number;
    error: string | null;
    startedAt: string;
    completedAt: string | null;
}

interface HistoryResponse {
    data: BackupRecord[];
    total: number;
    page: number;
    totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number): string => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDateTime = (iso: string): string => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getDuration = (start: string, end: string | null): string => {
    if (!end) return "—";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
};

// ─── Status Badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: BackupRecord["status"] }) => {
    if (status === "completed") return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-2.5 w-2.5" />Completed
        </span>
    );
    if (status === "failed") return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
            <XCircle className="h-2.5 w-2.5" />Failed
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
            <Loader2 className="h-2.5 w-2.5 animate-spin" />Running
        </span>
    );
};

// ─── Schedule Badge ───────────────────────────────────────────────────────────

const ScheduleBadge = ({ schedule }: { schedule: BackupRecord["schedule"] }) => {
    const map = {
        manual:  { label: "Manual",  color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
        daily:   { label: "Daily",   color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
        weekly:  { label: "Weekly",  color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
        monthly: { label: "Monthly", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    };
    const { label, color } = map[schedule];
    return (
        <span className={cn("inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border", color)}>
            {label}
        </span>
    );
};

// ─── Expanded Collection Detail ───────────────────────────────────────────────

const CollectionDetail = ({ counts, total }: { counts: CollectionCounts; total: number }) => (
    <div className="px-4 pb-3 pt-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
            ["Lenders", counts.lenders],
            ["Investments", counts.investments],
            ["Repayments", counts.repayments],
            ["Vehicles", counts.vehicles],
            ["Consignments", counts.consignments],
            ["Vehicle Owners", counts.vehicleOwners],
            ["Users", counts.users],
            ["Counters", counts.counters],
        ] as [string, number][]).map(([label, count]) => (
            <div key={label} className="rounded-md bg-muted/30 border border-border px-2.5 py-1.5">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{count.toLocaleString("en-IN")}</p>
            </div>
        ))}
        <div className="col-span-2 sm:col-span-4 rounded-md bg-primary/5 border border-primary/20 px-2.5 py-1.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-primary">Total Records</p>
            <p className="text-sm font-bold text-primary tabular-nums">{total.toLocaleString("en-IN")}</p>
        </div>
    </div>
);

const SecurityDetail = ({ backup }: { backup: BackupRecord }) => (
    <div className="px-4 pb-3 flex flex-wrap gap-2">
        <div className={cn(
            "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5",
            backup.isPasswordProtected
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-amber-500/5 border-amber-500/20"
        )}>
            <span className="text-[11px]">{backup.isPasswordProtected ? "🔒" : "🔓"}</span>
            <p className={cn("text-[10px] font-bold", backup.isPasswordProtected ? "text-emerald-400" : "text-amber-400")}>
                {backup.isPasswordProtected ? "ZIP Password Protected (AES-256)" : "No ZIP Password"}
            </p>
        </div>
        {backup.checksum && (
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
                <span className="text-[11px]">🔐</span>
                <p className="text-[10px] font-mono text-muted-foreground">
                    SHA-256: {backup.checksum.substring(0, 20)}…
                </p>
            </div>
        )}
    </div>
);

// ─── Backup Row ───────────────────────────────────────────────────────────────

const BackupRow = ({ backup, onDelete }: { backup: BackupRecord; onDelete: () => void }) => {
    const [expanded, setExpanded] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm(`Delete backup "${backup.fileName}"? This also removes it from your Telegram channel.`)) return;
        setDeleting(true);
        const tid = toast.loading("Deleting backup…");
        try {
            await axios.delete(`/backups/${backup._id}`);
            toast.success("Backup deleted", { id: tid });
            onDelete();
        } catch {
            toast.error("Failed to delete backup", { id: tid });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="border-b border-border last:border-b-0">
            <div
                onClick={() => setExpanded(e => !e)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 cursor-pointer transition-colors"
            >
                {/* Expand toggle */}
                <button className="text-muted-foreground shrink-0">
                    {expanded
                        ? <ChevronDown className="h-3.5 w-3.5" />
                        : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {/* ID + Schedule */}
                <div className="flex flex-col gap-0.5 min-w-[80px]">
                    <span className="text-[10px] font-mono font-bold text-foreground">{backup.backupId}</span>
                    <ScheduleBadge schedule={backup.schedule} />
                </div>

                {/* File name */}
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate flex items-center gap-1.5">
                        <FileArchive className="h-3 w-3 text-muted-foreground shrink-0" />
                        {backup.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Calendar className="h-2.5 w-2.5" />
                        {formatDateTime(backup.startedAt)}
                        {backup.completedAt && (
                            <span className="ml-1">· {getDuration(backup.startedAt, backup.completedAt)}</span>
                        )}
                    </p>
                </div>

                {/* Size + Records */}
                <div className="hidden sm:block text-right shrink-0">
                    <p className="text-xs font-bold tabular-nums text-foreground">{formatBytes(backup.fileSize)}</p>
                    <p className="text-[10px] text-muted-foreground">{backup.totalRecords?.toLocaleString("en-IN") ?? "—"} records</p>
                </div>

                {/* Status */}
                <div className="shrink-0">
                    <StatusBadge status={backup.status} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    {backup.telegramLink && (
                        <a
                            href={backup.telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-7 items-center gap-1 px-2 rounded-md hover:bg-sky-500/10 transition-colors group"
                            title="Open in Telegram"
                        >
                            <Send className="h-3 w-3 text-muted-foreground group-hover:text-sky-400 transition-colors" />
                            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-sky-400 transition-colors hidden sm:inline">Telegram</span>
                        </a>
                    )}
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-red-500/10 transition-colors group"
                        title="Delete backup"
                    >
                        {deleting
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            : <Trash2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-red-400 transition-colors" />}
                    </button>
                </div>
            </div>

            {/* Expanded detail */}
            {expanded && (
                <div className="bg-muted/10 border-t border-border/50">
                    {backup.status === "failed" && backup.error && (
                        <div className="px-4 pt-3 pb-1 flex items-start gap-2 text-red-400">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <p className="text-[11px]">{backup.error}</p>
                        </div>
                    )}
                    {backup.status === "completed" && (
                        <SecurityDetail backup={backup} />
                    )}
                    {backup.collections && backup.status === "completed" && (
                        <CollectionDetail counts={backup.collections} total={backup.totalRecords} />
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Fetch backup history ─────────────────────────────────────────────────────

const fetchHistory = async (page: number): Promise<HistoryResponse> => {
    const res = await axios.get<{
        data: BackupRecord[];
        meta: { total: number; page: number; totalPages: number };
    }>("/backups", { params: { page, limit: 20 } });
    return {
        data: res.data.data,
        total: res.data.meta?.total ?? 0,
        page:  res.data.meta?.page  ?? 1,
        totalPages: res.data.meta?.totalPages ?? 1,
    };
};

// ─── Main History Table ───────────────────────────────────────────────────────

export function BackupHistoryTable({ onDeleted }: { onDeleted: () => void }) {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery<HistoryResponse>({
        queryKey: ["backup-history", page],
        queryFn: () => fetchHistory(page),
        refetchOnWindowFocus: false,  // only refresh when user explicitly asks
        staleTime: Infinity,          // never auto-refetch — use invalidateQueries to trigger manually
    });

    const handleDelete = () => {
        queryClient.invalidateQueries({ queryKey: ["backup-history"] });
        onDeleted();
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!data?.data.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
                <FileArchive className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No backups yet</p>
                <p className="text-xs text-muted-foreground">Use &quot;Backup to Telegram&quot; or configure a schedule above</p>
            </div>
        );
    }

    return (
        <div>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[auto_auto_1fr_auto_auto_auto] gap-3 px-4 py-2.5 bg-muted/30 border-b border-border">
                <div className="w-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-20">ID</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">File</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Size</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Actions</p>
            </div>

            {data.data.map(backup => (
                <BackupRow key={backup._id} backup={backup} onDelete={handleDelete} />
            ))}

            {/* Pagination */}
            {data.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                        Page {data.page} of {data.totalPages} · {data.total} total
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page <= 1} className="h-7 text-xs">Previous</Button>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={data.page >= data.totalPages} className="h-7 text-xs">Next</Button>
                    </div>
                </div>
            )}
        </div>
    );
}
