"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { formatApiErrors } from "@lib/formatApiErrors";
import { COST_CATEGORIES } from "@data/vehicle-constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    Plus, Trash2, Pencil, Check, X, IndianRupee,
    Loader2, Wrench, ChevronDown, ChevronRight, CalendarDays, FileText
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────

type CostCategory = (typeof COST_CATEGORIES)[number];

type AddBreakdownForm = {
    name: string;
    amount: number;
    date: string;
    notes: string;
};

// ── Add Breakdown Item Dialog ─────────────────────────────────────

const AddBreakdownDialog = ({
    vehicleId, category, open, onClose
}: {
    vehicleId: string;
    category: CostCategory;
    open: boolean;
    onClose: () => void;
}) => {
    const queryClient = useQueryClient();
    const [tid, setTid] = useState<string | number | undefined>();

    const form = useForm<AddBreakdownForm>({
        defaultValues: {
            name: "",
            amount: 0,
            date: new Date().toISOString().split("T")[0],
            notes: "",
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: AddBreakdownForm) => {
            setTid(toast.loading("Adding item..."));
            return axios.post(`/vehicles/${vehicleId}/costs/breakdown`, {
                category: category.category,
                name: values.name,
                amount: values.amount,
                date: values.date || undefined,
                notes: values.notes || undefined,
            });
        },
        onSuccess: () => {
            toast.success("Cost item added!", { id: tid });
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
            form.reset();
            onClose();
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-sm max-h-[90vh] flex flex-col bg-card border-border">
                {/* Header */}
                <div className="glass-header relative p-5">
                    <div className="absolute -top-12 -right-12 h-24 w-24 rounded-full bg-primary/10 blur-3xl" />
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                            <Wrench className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                {category.icon} Add {category.label} Item
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Add a detailed breakdown entry
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                rules={{ required: "Item name is required" }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-foreground">
                                            Item Name <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder={`e.g. ${category.category === "workshop" ? "Engine repair" : category.category === "spareParts" ? "Brake pads" : "Description"}`}
                                                className="h-9 bg-muted/50 border-border text-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="amount"
                                rules={{ min: { value: 1, message: "Amount must be > 0" } }}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold text-foreground">
                                            Amount (₹) <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="h-9 bg-muted/50 border-border pl-7 text-sm"
                                                    value={field.value || ""}
                                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-foreground">Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Optional note" className="h-9 bg-muted/50 border-border text-sm" {...field} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="border-t border-border bg-muted/20 p-4 flex justify-end gap-3">
                            <Button type="button" variant="outline" onClick={onClose} className="border-border text-sm">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90 text-sm">
                                {isPending ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Adding...</> : <><Plus className="mr-1.5 h-3.5 w-3.5" />Add Item</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Inline Amount Editor ──────────────────────────────────────────

const InlineAmountEditor = ({
    vehicleId, categoryKey, currentAmount, onSaved
}: {
    vehicleId: string;
    categoryKey: string;
    currentAmount: number;
    onSaved: () => void;
}) => {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(currentAmount.toString());
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: (amount: number) =>
            axios.patch(`/vehicles/${vehicleId}/costs`, { [categoryKey]: amount }),
        onSuccess: () => {
            toast.success("Cost updated");
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
            setEditing(false);
            onSaved();
        },
        onError: () => toast.error("Failed to update cost"),
    });

    if (!editing) {
        return (
            <div className="flex items-center gap-1.5">
                <span className={cn("font-bold text-sm", currentAmount > 0 ? "text-primary" : "text-muted-foreground")}>
                    {formatCurrency(currentAmount)}
                </span>
                <button
                    onClick={() => { setEditing(true); setValue(currentAmount.toString()); }}
                    className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded hover:bg-muted transition-all"
                    title="Edit amount"
                >
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
                <IndianRupee className="absolute left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="number"
                    min="0"
                    step="0.01"
                    autoFocus
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") mutate(parseFloat(value) || 0);
                        if (e.key === "Escape") setEditing(false);
                    }}
                    className="h-7 w-28 pl-6 pr-1 text-xs bg-muted/80 border-primary"
                />
            </div>
            <button
                onClick={() => mutate(parseFloat(value) || 0)}
                disabled={isPending}
                className="flex h-6 w-6 items-center justify-center rounded bg-primary text-white hover:opacity-90"
            >
                {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            </button>
            <button
                onClick={() => setEditing(false)}
                className="flex h-6 w-6 items-center justify-center rounded bg-muted text-muted-foreground hover:bg-muted/80"
            >
                <X className="h-3 w-3" />
            </button>
        </div>
    );
};

// ── Category Row ──────────────────────────────────────────────────

const CategoryRow = ({
    cat, vehicle, vehicleId
}: {
    cat: CostCategory;
    vehicle: IVehicle;
    vehicleId: string;
}) => {
    const [expanded, setExpanded] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const amount = (vehicle[cat.key as keyof IVehicle] as number) || 0;
    const breakdown = vehicle.costBreakdowns.find((b) => b.category === cat.category);
    const items = breakdown?.items ?? [];
    const hasItems = items.length > 0;

    const { mutate: deleteItem, isPending: isDeleting } = useMutation({
        mutationFn: (itemId: string) =>
            axios.delete(`/vehicles/${vehicleId}/costs/breakdown/${itemId}`),
        onSuccess: () => {
            toast.success("Item removed");
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicleId] });
        },
        onError: () => toast.error("Failed to delete item"),
    });

    return (
        <>
            <div
                className={cn(
                    "group px-5 py-3 hover:bg-muted/20 transition-colors",
                    amount === 0 && !hasItems ? "opacity-60" : ""
                )}
            >
                {/* Category header row */}
                <div className="flex items-center gap-2">
                    {/* Expand toggle */}
                    <button
                        onClick={() => setExpanded((v) => !v)}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                        <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            <span className="text-base">{cat.icon}</span>
                            <span className="truncate">{cat.label}</span>
                        </span>
                        {hasItems && (
                            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {items.length}
                            </span>
                        )}
                        {hasItems && (
                            expanded
                                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-1" />
                        )}
                    </button>

                    {/* Amount + edit */}
                    <InlineAmountEditor
                        vehicleId={vehicleId}
                        categoryKey={cat.key}
                        currentAmount={amount}
                        onSaved={() => { }}
                    />

                    {/* Add item button */}
                    <button
                        onClick={() => { setAddDialogOpen(true); setExpanded(true); }}
                        className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
                        title={`Add ${cat.label} item`}
                    >
                        <Plus className="h-3 w-3" />
                    </button>
                </div>

                {/* Breakdown items */}
                {(expanded || hasItems) && items.length > 0 && (
                    <div className="mt-2 ml-7 space-y-1.5">
                        {items.map((item) => (
                            <div
                                key={item._id}
                                className="group/item flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 border border-border/50"
                            >
                                <div className="flex items-start gap-2 min-w-0">
                                    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                        <FileText className="h-2.5 w-2.5 text-primary" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {item.date && (
                                                <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                                                    <CalendarDays className="h-2.5 w-2.5" />
                                                    {formatDate(item.date)}
                                                </span>
                                            )}
                                            {item.notes && (
                                                <span className="text-[10px] text-muted-foreground italic truncate">
                                                    {item.notes}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-xs font-bold text-primary">{formatCurrency(item.amount)}</span>
                                    <button
                                        onClick={() => deleteItem(item._id)}
                                        disabled={isDeleting}
                                        className="opacity-0 group-hover/item:opacity-100 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                        title="Remove item"
                                    >
                                        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Empty state with add prompt */}
                {expanded && items.length === 0 && (
                    <div className="mt-2 ml-7">
                        <button
                            onClick={() => setAddDialogOpen(true)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                            <Plus className="h-3 w-3" /> Add detailed breakdown item
                        </button>
                    </div>
                )}
            </div>

            {/* Add Breakdown Dialog */}
            <AddBreakdownDialog
                vehicleId={vehicleId}
                category={cat}
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
            />
        </>
    );
};

// ── Main CostsTab ─────────────────────────────────────────────────

const CostsTab = ({ vehicle }: { vehicle: IVehicle }) => {
    const totalReconditioning = vehicle.totalInvestment - vehicle.purchasePrice;
    const queryClient = useQueryClient();

    const { mutate: syncCosts, isPending: isSyncing } = useMutation({
        mutationFn: () => axios.post(`/vehicles/${vehicle._id}/costs/recalc`),
        onSuccess: () => {
            toast.success("Costs synchronized successfully");
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle._id] });
        },
        onError: () => toast.error("Failed to sync costs"),
    });

    const isMismatched = COST_CATEGORIES.some(cat => {
        const amount = (vehicle[cat.key as keyof IVehicle] as number) || 0;
        const breakdown = vehicle.costBreakdowns.find(b => b.category === cat.category);
        const sum = breakdown?.items.reduce((s, i) => s + (i.amount || 0), 0) || 0;
        return (breakdown?.items.length ?? 0) > 0 && amount !== sum;
    });

    return (
        <div className="space-y-4">
            {/* Summary bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Purchase Price</p>
                    <p className="text-base font-bold text-foreground">{formatCurrency(vehicle.purchasePrice)}</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Reconditioning</p>
                    <p className="text-base font-bold text-orange-400">+{formatCurrency(totalReconditioning)}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Total Investment</p>
                    <p className="text-base font-bold text-primary">{formatCurrency(vehicle.totalInvestment)}</p>
                </div>
            </div>

            {/* Cost categories */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/20">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            Reconditioning Costs
                        </p>
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">
                            Hover a row to edit amount or add items
                        </p>
                    </div>
                    {isMismatched && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => syncCosts()} 
                            disabled={isSyncing}
                            className="h-7 text-xs border-orange-400 text-orange-400 hover:bg-orange-400/10"
                        >
                            {isSyncing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
                            Fix Sync Issue
                        </Button>
                    )}
                </div>

                {/* Rows */}
                <div className="divide-y divide-border">
                    {COST_CATEGORIES.map((cat) => (
                        <CategoryRow
                            key={cat.key}
                            cat={cat}
                            vehicle={vehicle}
                            vehicleId={vehicle._id}
                        />
                    ))}
                </div>

                {/* Footer total */}
                <div className="border-t-2 border-primary/20 px-5 py-4 flex justify-between items-center bg-primary/5">
                    <div>
                        <span className="font-bold text-foreground">Total Investment</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Purchase + all reconditioning costs</p>
                    </div>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(vehicle.totalInvestment)}</span>
                </div>
            </div>

            {/* Help text */}
            <p className="text-[11px] text-muted-foreground text-center">
                💡 Hover any row to edit the amount · Click <strong>+</strong> to add detailed breakdown items · Total Investment auto-recalculates
            </p>
        </div>
    );
};

export default CostsTab;
