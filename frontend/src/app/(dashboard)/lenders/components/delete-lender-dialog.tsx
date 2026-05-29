"use client";

import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AlertTriangle, ToggleLeft, X, Loader2,
    RotateCcw, Trash2, ShieldAlert,
} from "lucide-react";
import {
    AlertDialog, AlertDialogContent,
    AlertDialogTitle, AlertDialogDescription,
} from "@/components/ui/alert-dialog";

type DeleteLenderDialogProps = {
    lender: ILenderWithSummary;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

// ── Deactivate dialog (for active lenders) ─────────────────────────────────
const DeactivateDialog = ({ lender, open, onOpenChange }: DeleteLenderDialogProps) => {
    const [tid, setTid] = useState<string | number | undefined>();
    const qc = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            setTid(toast.loading("Deactivating…", { description: "Please wait." }));
            return axios.delete(`/lenders/${lender._id}`);
        },
        onSuccess: () => {
            toast.success("Deactivated!", { id: tid, description: `${lender.name} has been deactivated.` });
            qc.invalidateQueries({ queryKey: ["lenders"] });
            qc.invalidateQueries({ queryKey: ["lender-stats"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const e = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message || "Failed to deactivate!" });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl p-6 bg-card border-border sm:w-full">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-warning/10">
                        <AlertTriangle className="h-6 w-6 text-warning" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Deactivate &ldquo;{lender.name}&rdquo;?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
                            This lender will be marked as <strong>inactive</strong>. All investments and repayments remain intact. You can restore them anytime.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                    <Button disabled={isPending} onClick={() => mutate()} className="cursor-pointer bg-gradient-warning text-white hover:opacity-90">
                        {isPending
                            ? <><Loader2 size={16} className="mr-2 animate-spin" /> Deactivating…</>
                            : <><ToggleLeft size={16} className="mr-2" /> Deactivate</>}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ── Restore + Permanent Delete dialog (for inactive lenders) ───────────────
const InactiveActionsDialog = ({ lender, open, onOpenChange }: DeleteLenderDialogProps) => {
    const [action, setAction] = useState<"restore" | "delete" | null>(null);
    const [tid, setTid] = useState<string | number | undefined>();
    const qc = useQueryClient();

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ["lenders"] });
        qc.invalidateQueries({ queryKey: ["lender-stats"] });
    };

    const restoreMutation = useMutation({
        mutationFn: async () => {
            setAction("restore");
            setTid(toast.loading("Restoring…", { description: "Re-activating lender." }));
            return axios.patch(`/lenders/${lender._id}/restore`);
        },
        onSuccess: () => {
            toast.success("Restored!", { id: tid, description: `${lender.name} is now active again.` });
            invalidate();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const e = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message || "Restore failed!" });
            setAction(null);
        },
    });

    const hardDeleteMutation = useMutation({
        mutationFn: async () => {
            setAction("delete");
            setTid(toast.loading("Deleting…", { description: "Permanently removing lender." }));
            return axios.delete(`/lenders/${lender._id}/hard`);
        },
        onSuccess: () => {
            toast.success("Deleted!", { id: tid, description: `${lender.name} has been permanently removed.` });
            invalidate();
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const e = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message || "Delete failed!" });
            setAction(null);
        },
    });

    const isPending = restoreMutation.isPending || hardDeleteMutation.isPending;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[92vw] max-w-md rounded-2xl p-0 bg-card border-border sm:w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-start gap-4 p-6 pb-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted/50 border border-border">
                        <ShieldAlert className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-lg font-bold text-foreground">
                            Manage &ldquo;{lender.name}&rdquo;
                        </AlertDialogTitle>
                        <AlertDialogDescription className="mt-1 text-sm text-muted-foreground">
                            This lender is currently <span className="font-semibold text-warning">inactive</span>. Choose an action below.
                        </AlertDialogDescription>
                    </div>
                </div>

                {/* Action cards */}
                <div className="px-6 pb-4 space-y-3">
                    {/* Restore */}
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => restoreMutation.mutate()}
                        className="group w-full flex items-start gap-4 rounded-xl border-2 border-border bg-muted/20 p-4 text-left hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                            {action === "restore" && isPending
                                ? <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                                : <RotateCcw className="h-5 w-5 text-emerald-500" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground group-hover:text-emerald-600 transition-colors">
                                Restore Lender
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Re-activate this lender. All their investments and repayments remain intact.
                            </p>
                        </div>
                    </button>

                    {/* Permanent delete */}
                    <button
                        type="button"
                        disabled={isPending}
                        onClick={() => hardDeleteMutation.mutate()}
                        className="group w-full flex items-start gap-4 rounded-xl border-2 border-border bg-muted/20 p-4 text-left hover:border-destructive/50 hover:bg-destructive/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                            {action === "delete" && isPending
                                ? <Loader2 className="h-5 w-5 text-destructive animate-spin" />
                                : <Trash2 className="h-5 w-5 text-destructive" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">
                                Permanently Delete
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                Remove this lender forever. <span className="text-destructive font-medium">This cannot be undone.</span>
                            </p>
                        </div>
                    </button>
                </div>

                {/* Footer */}
                <div className="border-t border-border bg-muted/20 px-6 py-4 flex justify-end">
                    <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                        <X size={16} className="mr-2" /> Cancel
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ── Smart wrapper — picks dialog based on lender status ───────────────────
const DeleteLenderDialog = ({ lender, open, onOpenChange }: DeleteLenderDialogProps) => {
    if (lender.isActive) {
        return <DeactivateDialog lender={lender} open={open} onOpenChange={onOpenChange} />;
    }
    return <InactiveActionsDialog lender={lender} open={open} onOpenChange={onOpenChange} />;
};

export default DeleteLenderDialog;
