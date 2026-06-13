"use client";

import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { toast } from "sonner";
import {
    HardDrive, Play, RefreshCw, Loader2, Database, ChevronDown, ChevronRight,
    Settings2, Shield, Info, FileArchive, Users, Car, Store, ArrowDownLeft,
    ArrowUpRight, BarChart3, CheckCircle2, XCircle, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BackupScheduleCard } from "./backup-schedule-card";
import { BackupHistoryTable } from "./backup-history-table";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StorageStatus {
    configured: boolean;
    connected: boolean;
    storageType: string;
    botName?: string;
    chatId?: string;
    totalBackups?: number;
    message?: string;
    isPasswordProtected?: boolean;
    isEmailConfigured?: boolean;
}

interface BackupSettings {
    dailyEnabled: boolean;
    dailyTime: string;
    weeklyEnabled: boolean;
    weeklyDay: number;
    weeklyTime: string;
    monthlyEnabled: boolean;
    monthlyDay: number;
    monthlyTime: string;
    retentionPolicy: { daily: number; weekly: number; monthly: number };
}

// ─── API ──────────────────────────────────────────────────────────────────────

const fetchStorageStatus = async (): Promise<StorageStatus> => {
    const res = await axios.get<{ data: StorageStatus }>("/backups/status");
    return res.data.data;
};

const fetchSettings = async (): Promise<BackupSettings> => {
    const res = await axios.get<{ data: BackupSettings }>("/backups/settings");
    return res.data.data;
};

// ─── Telegram Status Card ─────────────────────────────────────────────────────

const TelegramStatusCard = ({ status }: { status: StorageStatus | undefined }) => {
    if (!status) return <div className="rounded-2xl border border-border bg-card p-5 animate-pulse h-44" />;

    const isConnected  = status.configured && status.connected;

    return (
        <div className={cn(
            "rounded-2xl border p-5 transition-all",
            isConnected
                ? "border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-card"
                : "border-border bg-card"
        )}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl shadow-sm",
                        isConnected ? "bg-sky-500/15" : "bg-muted"
                    )}>
                        <Send className={cn("h-5 w-5", isConnected ? "text-sky-400" : "text-muted-foreground")} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Telegram Storage</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isConnected
                                ? `@${status.botName} · Chat ${status.chatId}`
                                : status.configured
                                    ? "Connection failed — check token"
                                    : "Not configured"}
                        </p>
                    </div>
                </div>
                <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold border",
                    isConnected
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                        : "bg-muted text-muted-foreground border-border"
                )}>
                    {isConnected
                        ? <><CheckCircle2 className="h-3 w-3" />Connected</>
                        : <><XCircle className="h-3 w-3" />Not set up</>}
                </span>
            </div>

            {/* Stats row */}
            {isConnected && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/40 border border-border p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Total Backups</p>
                        <p className="text-xl font-bold text-foreground">{status.totalBackups ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 border border-border p-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Storage Cost</p>
                        <p className="text-xl font-bold text-emerald-400">Free ∞</p>
                    </div>
                </div>
            )}

            {/* Security badges — shown always */}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                    status.isPasswordProtected
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/30 border-border"
                )}>
                    <Shield className={cn("h-3.5 w-3.5 shrink-0", status.isPasswordProtected ? "text-emerald-400" : "text-muted-foreground")} />
                    <div>
                        <p className={cn("text-[10px] font-bold", status.isPasswordProtected ? "text-emerald-400" : "text-muted-foreground")}>
                            ZIP Password
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                            {status.isPasswordProtected ? "AES-256 active ✓" : "Not set in .env"}
                        </p>
                    </div>
                </div>
                <div className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                    status.isEmailConfigured
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-muted/30 border-border"
                )}>
                    <Send className={cn("h-3.5 w-3.5 shrink-0", status.isEmailConfigured ? "text-emerald-400" : "text-muted-foreground")} />
                    <div>
                        <p className={cn("text-[10px] font-bold", status.isEmailConfigured ? "text-emerald-400" : "text-muted-foreground")}>
                            Email Alerts
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                            {status.isEmailConfigured ? "Success/fail alerts ✓" : "Not configured"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Setup guide when not configured */}
            {!status.configured && (
                <div className="mt-3 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground">Quick Setup (2 min):</p>
                    <ol className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex gap-2"><span className="text-sky-400 font-bold shrink-0">1.</span>Telegram → search <code className="bg-muted px-1 rounded">@BotFather</code> → send <code className="bg-muted px-1 rounded">/newbot</code> → copy <strong>Bot Token</strong></li>
                        <li className="flex gap-2"><span className="text-sky-400 font-bold shrink-0">2.</span>Create a Telegram Channel → add your bot as <strong>Admin</strong></li>
                        <li className="flex gap-2"><span className="text-sky-400 font-bold shrink-0">3.</span>Open <code className="bg-muted px-1 rounded text-[10px]">api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code> → copy the <strong>chat id</strong></li>
                        <li className="flex gap-2"><span className="text-sky-400 font-bold shrink-0">4.</span>Add to <code className="bg-muted px-1 rounded">backend/.env</code> and restart</li>
                    </ol>
                    <div className="rounded bg-muted/50 border border-border p-2 font-mono text-[10px] text-muted-foreground space-y-0.5">
                        <p>TELEGRAM_BOT_TOKEN=1234567890:ABC-token</p>
                        <p>TELEGRAM_CHAT_ID=-1001234567890</p>
                        <p>BACKUP_ZIP_PASSWORD=your-strong-password</p>
                    </div>
                </div>
            )}

            {isConnected && (
                <p className="mt-3 text-[11px] text-sky-400/70">
                    ✅ Backups are sent as password-protected ZIPs to your Telegram channel
                </p>
            )}
        </div>
    );
};

// ─── Manual Trigger Card ──────────────────────────────────────────────────────

const TriggerCard = ({ onTriggered }: { onTriggered: () => void }) => {
    const [triggering, setTriggering] = useState(false);

    const handleTrigger = async () => {
        setTriggering(true);
        const tid = toast.loading("Starting backup…", { description: "Exporting all collections to JSON" });
        try {
            await axios.post("/backups/trigger", { schedule: "manual" });
            toast.success("Backup started!", {
                id: tid,
                description: "Running in background — it will appear in your Telegram channel shortly",
            });
            setTimeout(onTriggered, 4000);
        } catch {
            toast.error("Failed to trigger backup", { id: tid });
        } finally {
            setTriggering(false);
        }
    };

    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <Play className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-bold text-foreground">Manual Backup</p>
                    <p className="text-xs text-muted-foreground">Export all data and send to Telegram</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                    { icon: Users, label: "Lenders & Investors" },
                    { icon: Car, label: "Vehicles & Sales" },
                    { icon: Store, label: "Consignments" },
                    { icon: BarChart3, label: "Investments & Repayments" },
                ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2 rounded-lg bg-muted/40 border border-border px-2.5 py-2">
                        <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-[10px] font-medium text-muted-foreground leading-tight">{label}</span>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <Button
                    onClick={handleTrigger}
                    disabled={triggering}
                    className="bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90 shadow-sm"
                >
                    {triggering
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Backing Up…</>
                        : <><Send className="mr-2 h-4 w-4" />Backup to Telegram</>}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                    ZIP sent to your Telegram channel — free forever
                </p>
            </div>
        </div>
    );
};

// ─── Main BackupManager ───────────────────────────────────────────────────────

export function BackupManager() {
    const queryClient = useQueryClient();
    const [settingsOpen, setSettingsOpen] = useState(true);

    const { data: storageStatus } = useQuery<StorageStatus>({
        queryKey: ["backup-status"],
        queryFn: fetchStorageStatus,
        refetchOnWindowFocus: false, // only refresh on explicit Refresh button click
        staleTime: Infinity,         // never auto-refetch in the background
    });

    const { data: settings, isLoading: settingsLoading } = useQuery<BackupSettings>({
        queryKey: ["backup-settings"],
        queryFn: fetchSettings,
        refetchOnWindowFocus: false, // only refresh when settings are saved (invalidateQueries)
        staleTime: Infinity,         // never auto-refetch — settings change only on user save
    });

    const refreshHistory = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["backup-history"] });
        queryClient.invalidateQueries({ queryKey: ["backup-status"] });
    }, [queryClient]);

    return (
        <div className="flex flex-col gap-5 pb-10 max-w-5xl mx-auto">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 shadow-lg">
                        <HardDrive className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Backup Center</h1>
                        <p className="text-sm text-muted-foreground">Automated backup to Telegram — free, unlimited</p>
                    </div>
                </div>
                <Button
                    variant="outline" size="sm"
                    onClick={refreshHistory}
                    className="gap-2 border-border text-muted-foreground hover:text-foreground w-fit"
                >
                    <RefreshCw className="h-3.5 w-3.5" />Refresh
                </Button>
            </div>

            {/* ── Telegram Status + Trigger row ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TelegramStatusCard status={storageStatus} />
                <TriggerCard onTriggered={refreshHistory} />
            </div>

            {/* ── Schedule Configuration ──────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                    onClick={() => setSettingsOpen(s => !s)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Settings2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-foreground">Backup Schedule</p>
                            <p className="text-xs text-muted-foreground">Configure automatic backup frequency</p>
                        </div>
                    </div>
                    {settingsOpen
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>

                {settingsOpen && (
                    <div className="px-5 pb-5 border-t border-border">
                        {settingsLoading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : settings ? (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <BackupScheduleCard type="daily" enabled={settings.dailyEnabled} time={settings.dailyTime} retention={settings.retentionPolicy.daily} settings={settings} onSaved={() => queryClient.invalidateQueries({ queryKey: ["backup-settings"] })} />
                                <BackupScheduleCard type="weekly" enabled={settings.weeklyEnabled} time={settings.weeklyTime} day={settings.weeklyDay} retention={settings.retentionPolicy.weekly} settings={settings} onSaved={() => queryClient.invalidateQueries({ queryKey: ["backup-settings"] })} />
                                <BackupScheduleCard type="monthly" enabled={settings.monthlyEnabled} time={settings.monthlyTime} day={settings.monthlyDay} retention={settings.retentionPolicy.monthly} settings={settings} onSaved={() => queryClient.invalidateQueries({ queryKey: ["backup-settings"] })} />
                            </div>
                        ) : null}
                        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2.5">
                            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-blue-400/80">
                                All backup times run in <strong>IST (India Standard Time)</strong>. Recommended: schedule during off-hours (1:00 AM – 5:00 AM).
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── What Gets Backed Up ──────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Database className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Backup Contents</p>
                        <p className="text-xs text-muted-foreground">All data exported as structured JSON inside a ZIP file</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { file: "lenders.json", desc: "All lender profiles", icon: Users },
                        { file: "investments.json", desc: "Investment records", icon: ArrowDownLeft },
                        { file: "repayments.json", desc: "Repayment records", icon: ArrowUpRight },
                        { file: "vehicles.json", desc: "Vehicles + costs + sales", icon: Car },
                        { file: "consignments.json", desc: "Park & Finance sale", icon: Store },
                        { file: "vehicle-owners.json", desc: "Owner registry", icon: Users },
                        { file: "users.json", desc: "Accounts (no passwords)", icon: Shield },
                        { file: "counters.json", desc: "ID sequences", icon: BarChart3 },
                    ].map(({ file, desc, icon: Icon }) => (
                        <div key={file} className="rounded-lg bg-muted/30 border border-border p-3">
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className="h-3 w-3 text-primary" />
                                <p className="text-[10px] font-mono font-bold text-foreground">{file}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{desc}</p>
                        </div>
                    ))}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                    <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                    <p className="text-[11px] text-amber-400/80">
                        <strong>Security:</strong> Password hashes and auth tokens are never included in backups.
                    </p>
                </div>
            </div>

            {/* ── Backup History ────────────────────────────────────────────── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FileArchive className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-foreground">Backup History</p>
                        <p className="text-xs text-muted-foreground">Click any row to see collection details — open in Telegram to download</p>
                    </div>
                </div>
                <BackupHistoryTable onDeleted={refreshHistory} />
            </div>
        </div>
    );
}
