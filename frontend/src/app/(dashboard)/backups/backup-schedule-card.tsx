"use client";

import { useState } from "react";
import axios from "@config/axios";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Calendar, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackupSettings {
    dailyEnabled: boolean;
    dailyTime: string;
    weeklyEnabled: boolean;
    weeklyDay: number;
    weeklyTime: string;
    monthlyEnabled: boolean;
    monthlyDay: number;
    monthlyTime: string;
    retentionPolicy: {
        daily: number;
        weekly: number;
        monthly: number;
    };
}

interface BackupScheduleCardProps {
    type: "daily" | "weekly" | "monthly";
    enabled: boolean;
    time: string;
    day?: number;
    retention: number;
    settings: BackupSettings;
    onSaved: () => void;
}

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const typeConfig = {
    daily: {
        label: "Daily",
        emoji: "📅",
        gradient: "from-blue-500/10 to-card",
        border: "border-blue-500/20",
        accent: "text-blue-400",
        accentBg: "bg-blue-500/10",
        description: "Every day at a specified time",
    },
    weekly: {
        label: "Weekly",
        emoji: "📆",
        gradient: "from-violet-500/10 to-card",
        border: "border-violet-500/20",
        accent: "text-violet-400",
        accentBg: "bg-violet-500/10",
        description: "Once a week on a specific day",
    },
    monthly: {
        label: "Monthly",
        emoji: "🗓️",
        gradient: "from-emerald-500/10 to-card",
        border: "border-emerald-500/20",
        accent: "text-emerald-400",
        accentBg: "bg-emerald-500/10",
        description: "Once a month on a specific date",
    },
};

export function BackupScheduleCard({
    type, enabled, time, day, retention, settings, onSaved
}: BackupScheduleCardProps) {
    const cfg = typeConfig[type];

    const [localEnabled, setLocalEnabled] = useState(enabled);
    const [localTime, setLocalTime] = useState(time);
    const [localDay, setLocalDay] = useState<number>(day ?? 0);
    const [localRetention, setLocalRetention] = useState(retention);
    const [saving, setSaving] = useState(false);

    const isDirty =
        localEnabled !== enabled ||
        localTime !== time ||
        localDay !== (day ?? 0) ||
        localRetention !== retention;

    const handleSave = async () => {
        setSaving(true);
        const tid = toast.loading(`Saving ${type} schedule…`);
        try {
            const payload: BackupSettings = {
                ...settings,
                [`${type}Enabled`]: localEnabled,
                [`${type}Time`]: localTime,
                retentionPolicy: {
                    ...settings.retentionPolicy,
                    [type]: localRetention,
                },
            };

            if (type === "weekly") payload.weeklyDay = localDay;
            if (type === "monthly") payload.monthlyDay = localDay;

            await axios.put("/backups/settings", payload);
            toast.success(`${cfg.label} backup ${localEnabled ? "enabled" : "disabled"}`, {
                id: tid,
                description: localEnabled
                    ? `Will run at ${localTime} IST`
                    : "Automatic backup stopped",
            });
            onSaved();
        } catch {
            toast.error("Failed to save settings", { id: tid });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={cn(
            "rounded-xl border bg-gradient-to-br p-4 transition-all",
            cfg.gradient,
            localEnabled ? cfg.border : "border-border"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-base">{cfg.emoji}</span>
                    <div>
                        <p className={cn("text-sm font-bold", localEnabled ? cfg.accent : "text-foreground")}>
                            {cfg.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{cfg.description}</p>
                    </div>
                </div>
                <Switch
                    checked={localEnabled}
                    onCheckedChange={setLocalEnabled}
                    className={localEnabled ? "" : ""}
                />
            </div>

            {/* Config fields */}
            <div className={cn("space-y-2.5 transition-all", !localEnabled && "opacity-50 pointer-events-none")}>
                {/* Time */}
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                        <Clock className="h-2.5 w-2.5" /> Time (IST)
                    </label>
                    <Input
                        type="time"
                        value={localTime}
                        onChange={e => setLocalTime(e.target.value)}
                        className="h-8 bg-muted/50 border-border text-sm tabular-nums"
                    />
                </div>

                {/* Day picker for weekly */}
                {type === "weekly" && (
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                            <Calendar className="h-2.5 w-2.5" /> Day of Week
                        </label>
                        <Select value={String(localDay)} onValueChange={v => setLocalDay(Number(v))}>
                            <SelectTrigger className="h-8 bg-muted/50 border-border text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {DAYS_OF_WEEK.map((d, i) => (
                                    <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Day picker for monthly */}
                {type === "monthly" && (
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                            <Calendar className="h-2.5 w-2.5" /> Day of Month
                        </label>
                        <Select value={String(localDay)} onValueChange={v => setLocalDay(Number(v))}>
                            <SelectTrigger className="h-8 bg-muted/50 border-border text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                                    <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Retention */}
                <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                        <RotateCcw className="h-2.5 w-2.5" /> Keep Last
                    </label>
                    <Select value={String(localRetention)} onValueChange={v => setLocalRetention(Number(v))}>
                        <SelectTrigger className="h-8 bg-muted/50 border-border text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {(type === "daily"
                                ? [1, 2, 3, 5, 7, 14, 30]
                                : type === "weekly"
                                    ? [1, 2, 3, 4, 6, 8, 12]
                                    : [1, 2, 3, 6, 12]
                            ).map(n => (
                                <SelectItem key={n} value={String(n)}>
                                    {n} backup{n > 1 ? "s" : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Save button */}
            <Button
                size="sm"
                onClick={handleSave}
                disabled={!isDirty || saving}
                className={cn(
                    "w-full mt-3 h-8 text-xs font-semibold transition-all",
                    isDirty
                        ? "bg-primary text-white hover:opacity-90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
            >
                {saving
                    ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Saving…</>
                    : isDirty ? "Save Changes" : "Saved ✓"}
            </Button>
        </div>
    );
}
