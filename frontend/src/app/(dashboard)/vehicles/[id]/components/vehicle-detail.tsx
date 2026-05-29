"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { getClientSession } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { formatApiErrors } from "@lib/formatApiErrors";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
    ArrowLeft, Bike, Car, TrendingUp, TrendingDown, IndianRupee, ArrowLeftRight,
    DollarSign, Plus, Trash2, Loader2, FileText, Activity, Sparkles, ShoppingCart,
    Package, ExternalLink, Pencil, RotateCcw, Download, FileSpreadsheet, ChevronDown
} from "lucide-react";
import { AdminOnly } from "@components/shared";
import Link from "next/link";
import VehicleStatusBadge from "../../components/vehicle-status-badge";
import CostsTab from "./costs-tab";
import { PURCHASE_PAYMENT_MODES, SALE_PAYMENT_METHODS, NOC_STATUSES } from "@data/vehicle-constants";
import { recordSaleSchema, addPurchasePaymentSchema, addSalePaymentSchema, editBasicInfoSchema } from "@schemas/vehicle";
import { ExchangeVehiclePicker } from "@/components/exchange-vehicle-picker";

const fetchVehicle = async (id: string): Promise<IVehicle | null> => {
    const res = await axios.get<ApiResponse<IVehicle>>(`/vehicles/${id}`);
    return res.data.data ?? null;
};

// ── Record Sale Dialog ───────────────────────────────────────────
const RecordSaleDialog = ({ vehicle }: { vehicle: IVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(recordSaleSchema),
        defaultValues: {
            dateSold: new Date().toISOString().split("T")[0],
            soldPrice: 0, soldTo: "", soldToPhone: "",
            nocStatus: vehicle.vehicleType === "four_wheeler" ? "pending" : "not_applicable" as const,
            remarks: "",
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof recordSaleSchema>) => {
            setTid(toast.loading("Recording sale..."));
            return axios.post(`/vehicles/${vehicle._id}/sale`, values);
        },
        onSuccess: () => {
            toast.success("Sale recorded!", { id: tid });
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle._id] });
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            setOpen(false);
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-success text-white hover:opacity-90 cursor-pointer shadow-md">
                    <DollarSign className="mr-2 h-4 w-4" /> Record Sale
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-md p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-success/10 blur-3xl" />
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-success shadow-lg">
                            <DollarSign className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5"><Sparkles className="h-3 w-3 text-success" /><span className="text-[10px] font-bold tracking-widest text-success uppercase">Sale</span></div>
                            <DialogTitle className="text-lg font-bold text-foreground">Record Sale</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model} &mdash; {vehicle.registrationNo}</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form id="record-sale-form" onSubmit={form.handleSubmit((v) => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-5 space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="dateSold" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground text-xs">Date Sold <span className="text-destructive">*</span></FormLabel>
                                            <FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="soldPrice" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground text-xs">Sold Price &#8377; <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                    <Input type="number" min="0" className="h-9 bg-muted/50 border-border pl-7 text-sm" value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="soldTo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground text-xs">Buyer Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl><Input placeholder="Buyer's name" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="soldToPhone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground text-xs">Buyer Phone</FormLabel>
                                        <FormControl><Input placeholder="+91 9876543210" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                                {vehicle.vehicleType === "four_wheeler" && (
                                    <FormField control={form.control} name="nocStatus" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground text-xs">NOC Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>{NOC_STATUSES.map((n) => <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground text-xs">Remarks</FormLabel>
                                        <FormControl><Textarea placeholder="Any additional notes..." rows={2} className="resize-none bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                        <div className="border-t border-border bg-muted/20 p-4 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-success text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Record Sale"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Add Purchase Payment Dialog ───────────────────────────────────
const AddPurchasePaymentDialog = ({ vehicle }: { vehicle: IVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(addPurchasePaymentSchema),
        defaultValues: { date: new Date().toISOString().split("T")[0], amount: 0, mode: "Cash" as const, bankAccount: "", notes: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof addPurchasePaymentSchema>) => {
            setTid(toast.loading("Recording payment..."));
            return axios.post(`/vehicles/${vehicle._id}/purchase-payments`, values);
        },
        onSuccess: () => {
            toast.success("Payment recorded!", { id: tid });
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle._id] });
            form.reset();
            setOpen(false);
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-border text-foreground hover:bg-muted">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-sm p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg"><ShoppingCart className="h-4 w-4 text-white" /></div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">Purchase Payment</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Record payment made to seller</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Date *</FormLabel>
                                        <FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Amount &#8377; *</FormLabel>
                                        <FormControl><Input type="number" min="0" className="h-9 bg-muted/50 border-border text-sm" value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="mode" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Mode *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{PURCHASE_PAYMENT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="bankAccount" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Bank Account (for 4W)</FormLabel>
                                    <FormControl><Input placeholder="e.g. Axis 2541" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel>
                                    <FormControl><Input placeholder="advance, balance, etc." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="border-t border-border bg-muted/20 p-4 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Record"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Add Sale Payment Dialog — Unified Payment Method ──────────────
const AddSalePaymentDialog = ({ vehicle }: { vehicle: IVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(addSalePaymentSchema),
        mode: "onBlur",
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            amount: undefined as unknown as number,
            mode: "Cash" as const,
            type: "cash" as const,
            financeCompany: "",
            loanRef: "",
            financeAmount: undefined as unknown as number,
            exchangeVehicleMake: "",
            exchangeVehicleRegNo: "",
            exchangeVehicleType: "two_wheeler" as const,
            exchangeDetails: "",
            createExchangeAs: "phase2_purchase" as const,
            addToInventory: true,
            referenceNo: "",
            notes: "",
        },
    });

    const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
    const isExchange = paymentMethod === "Exchange";
    const isFinance = paymentMethod === "Finance";

    const handleMethodChange = (method: string) => {
        setPaymentMethod(method);
        const found = SALE_PAYMENT_METHODS.find(m => m.value === method);
        if (found) {
            form.setValue("mode", found.backendMode as z.infer<typeof addSalePaymentSchema>["mode"]);
            form.setValue("type", found.backendType);
        }
        if (method !== "Exchange") {
            form.setValue("exchangeVehicleMake", "");
            form.setValue("exchangeVehicleRegNo", "");
            form.setValue("exchangeDetails", "");
        }
        if (method !== "Finance") {
            form.setValue("financeCompany", "");
            form.setValue("loanRef", "");
            form.setValue("financeAmount", 0);
        } else {
            // Auto-prefill company + remaining balance when switching TO Finance
            if (existingFinanceCompany) form.setValue("financeCompany", existingFinanceCompany);
            if (financeBalance > 0) form.setValue("amount", financeBalance);
            else if (!existingFinanceAmount && form.getValues("amount") === undefined) form.setValue("amount", undefined as unknown as number);
        }
    };

    const addToInventory = form.watch("addToInventory");

    // Pre-fill finance company if already set on vehicle
    const existingFinanceCompany = (vehicle as unknown as Record<string, unknown>).financeCompany as string | undefined;
    const existingFinanceAmount = (vehicle as unknown as Record<string, unknown>).financeAmount as number | undefined;
    const financePayments = vehicle.salePayments.filter(p => p.mode === "Finance");
    const totalFinanceDisbursed = financePayments.reduce((s, p) => s + p.amount, 0);
    const financeBalance = existingFinanceAmount ? Math.max(0, existingFinanceAmount - totalFinanceDisbursed) : 0;
    const isFirstFinanceEntry = !existingFinanceAmount || existingFinanceAmount === 0;
    const isFullyDisbursed = existingFinanceAmount && existingFinanceAmount > 0 && financeBalance === 0;

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof addSalePaymentSchema>) => {
            setTid(toast.loading("Recording payment..."));
            const payload = { ...values };
            if (values.type === "exchange") {
                payload.createExchangeAs = values.addToInventory ? "phase2_purchase" : "skip";
            } else {
                payload.createExchangeAs = "skip";
            }
            return axios.post<ApiResponse<{ vehicle: IVehicle; exchangeVehicle?: { vehicleId?: string; consignmentId?: string; make: string; registrationNo: string; collection: string; message: string } }>>(`/vehicles/${vehicle._id}/sale-payments`, payload);
        },
        onSuccess: (res) => {
            const ev = res.data?.data?.exchangeVehicle;
            if (ev) {
                toast.success(`Payment recorded! Exchange vehicle: ${ev.make} (${ev.registrationNo})`, { id: tid, duration: 6000 });
            } else {
                toast.success("Payment recorded!", { id: tid });
            }
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle._id] });
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            queryClient.invalidateQueries({ queryKey: ["consignments"] });
            form.reset();
            setPaymentMethod("Cash");
            setOpen(false);
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPaymentMethod("Cash"); form.reset(); } }}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-success text-white hover:opacity-90 cursor-pointer">
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-md p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-success shadow-lg"><DollarSign className="h-4 w-4 text-white" /></div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">Record Payment</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Record money received from buyer or finance</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* Date + Amount */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Date *</FormLabel>
                                        <FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">
                                        {isFinance ? "Disbursement Amount ₹ *" : isExchange ? "Exchange Value ₹ *" : "Amount ₹ *"}
                                    </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input type="number" min="0" className="h-9 bg-muted/50 border-border pl-7 text-sm" value={field.value ?? ""} onChange={(e) => { const v = parseFloat(e.target.value); field.onChange(isNaN(v) ? undefined : v); }} />
                                            </div>
                                        </FormControl><FormMessage /></FormItem>
                                )} />
                            </div>

                            {/* ── Payment Method Pills ── */}
                            <div>
                                <p className="text-xs font-semibold text-foreground mb-2">Payment Method *</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {SALE_PAYMENT_METHODS.map((m) => (
                                        <button
                                            key={m.value}
                                            type="button"
                                            onClick={() => handleMethodChange(m.value)}
                                            className={cn(
                                                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                                                paymentMethod === m.value
                                                    ? m.value === "Exchange"
                                                        ? "bg-orange-500/15 text-orange-400 border-orange-500/30 shadow-sm"
                                                        : m.value === "Finance"
                                                            ? "bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-sm"
                                                            : "bg-primary/15 text-primary border-primary/30 shadow-sm"
                                                    : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
                                            )}
                                        >
                                            <span>{m.icon}</span>
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ── Finance Section ── */}
                            {isFinance && (
                                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">💳</span>
                                        <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Finance / Loan Details</p>
                                    </div>

                                    {/* ── Context banner ── */}
                                    {isFirstFinanceEntry ? (
                                        // First time: guide to set up the finance
                                        <div className="rounded-lg bg-blue-500/10 border border-blue-400/20 px-3 py-2.5 text-[11px] text-blue-300 space-y-1">
                                            <p className="font-bold text-blue-300">Setting up Finance for this sale</p>
                                            <p className="text-blue-300/80">Enter the <strong className="text-blue-300">total sanctioned loan amount</strong> below, and the <strong className="text-blue-300">amount actually disbursed today</strong> in the amount field above. Finance can be received in multiple tranches.</p>
                                        </div>
                                    ) : isFullyDisbursed ? (
                                        // Fully disbursed already
                                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-[11px] text-emerald-300 flex items-center gap-2">
                                            <span>✅</span>
                                            <span>Sanctioned amount fully disbursed. You can still record an additional tranche if the loan was revised.</span>
                                        </div>
                                    ) : (
                                        // Partial disbursement in progress
                                        <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-3 py-2 text-[11px] text-blue-300 space-y-1">
                                            <div className="flex justify-between">
                                                <span>Sanctioned Loan</span>
                                                <span className="font-semibold">{formatCurrency(existingFinanceAmount!)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Already Disbursed ({financePayments.length} tranche{financePayments.length !== 1 ? "s" : ""})</span>
                                                <span className="font-semibold text-emerald-400">{formatCurrency(totalFinanceDisbursed)}</span>
                                            </div>
                                            <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1">
                                                <span className="font-bold">Remaining to Disburse</span>
                                                <span className={cn("font-bold", financeBalance > 0 ? "text-amber-400" : "text-emerald-400")}>{formatCurrency(financeBalance)}</span>
                                            </div>
                                            <p className="text-blue-300/70 pt-0.5">The amount above is pre-filled with the remaining balance. Edit if this tranche is different.</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <FormField control={form.control} name="financeCompany" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs font-semibold text-foreground">Finance Company *</FormLabel>
                                                <FormControl><Input placeholder={existingFinanceCompany || "HDFC, Bajaj Finance..."} className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="loanRef" render={({ field }) => (
                                            <FormItem><FormLabel className="text-xs font-semibold text-foreground">Loan Ref / File No</FormLabel>
                                                <FormControl><Input placeholder="LN2024XXXXX" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                        )} />
                                    </div>

                                    {isFirstFinanceEntry ? (
                                        /* ── First-time: freely editable ── */
                                        <FormField control={form.control} name="financeAmount" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold text-foreground">
                                                    Total Sanctioned Loan Amount ₹
                                                </FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                        <Input type="number" min="0"
                                                            placeholder="e.g. 150000"
                                                            className="h-9 bg-muted/50 border-border pl-7 text-sm"
                                                            value={field.value ?? ""}
                                                            onChange={(e) => { const v = parseFloat(e.target.value); field.onChange(isNaN(v) ? undefined : v); }} />
                                                    </div>
                                                </FormControl>
                                                <p className="text-[10px] text-muted-foreground">
                                                    Enter the full loan amount approved by the finance company. The actual disbursed amount goes in the field above.
                                                </p>
                                            </FormItem>
                                        )} />
                                    ) : (
                                        /* ── Subsequent tranche: locked display ── */
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-semibold text-foreground">Total Sanctioned Loan Amount ₹</p>
                                            <div className="flex items-center gap-2 h-9 rounded-lg border border-border bg-muted/30 px-3 cursor-not-allowed">
                                                <IndianRupee className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="text-sm font-semibold text-foreground">{existingFinanceAmount?.toLocaleString("en-IN") ?? "—"}</span>
                                                <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 opacity-60"><path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7A1.5 1.5 0 0 0 3 8.5v4A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 11 7V4.5A3.5 3.5 0 0 0 8 1Zm2 6V4.5a2 2 0 1 0-4 0V7h4Z" clipRule="evenodd" /></svg>
                                                    Locked
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">
                                                Sanctioned amount is fixed. Only the disbursement amount (above) can be changed per tranche.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Exchange Vehicle Section ── */}
                            {isExchange && (
                                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <ArrowLeftRight className="h-3.5 w-3.5 text-orange-400" />
                                        <p className="text-[11px] font-bold text-orange-400 uppercase tracking-widest">Exchange Vehicle Details</p>
                                    </div>
                                    <ExchangeVehiclePicker
                                        regNo={form.watch("exchangeVehicleRegNo") ?? ""}
                                        make={form.watch("exchangeVehicleMake") ?? ""}
                                        model=""
                                        vehicleType={form.watch("exchangeVehicleType") ?? "two_wheeler"}
                                        onChange={(v) => {
                                            form.setValue("exchangeVehicleRegNo", v.registrationNo);
                                            form.setValue("exchangeVehicleMake", `${v.make}${v.model ? " " + v.model : ""}`.trim());
                                            form.setValue("exchangeVehicleType", v.vehicleType);
                                        }}
                                    />
                                    <FormField control={form.control} name="exchangeDetails" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold text-foreground">Exchange Notes</FormLabel>
                                            <FormControl><Input placeholder="Condition, deal notes..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                    )} />
                                    <div className={cn("flex items-start gap-3 rounded-lg border p-3 transition-colors", addToInventory ? "border-emerald-500/30 bg-emerald-500/5" : "border-dashed border-border")}>
                                        <input type="checkbox" id="addToInventory" checked={addToInventory ?? true} onChange={e => form.setValue("addToInventory", e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-emerald-500" />
                                        <div>
                                            <label htmlFor="addToInventory" className="text-xs font-semibold text-foreground cursor-pointer">Auto-add to Purchased Inventory</label>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">Creates a new vehicle entry with the exchange value as purchase price</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Reference No</FormLabel>
                                    <FormControl><Input placeholder="UPI/Cheque/Loan ref..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel>
                                    <FormControl><Input placeholder="advance, partial disbursement, etc." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="border-t border-border bg-muted/20 p-4 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-success text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Record"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Edit Basic Info Dialog ───────────────────────────────────────
const EditBasicInfoDialog = ({ vehicle }: { vehicle: IVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const toDateStr = (d: Date | string) => new Date(d).toISOString().split("T")[0];
    const safeStatus = (s: string) =>
        (["in_stock", "reconditioning", "ready_for_sale"] as const).includes(s as never) ? s as "in_stock" | "reconditioning" | "ready_for_sale" : undefined;

    const defaultVals = () => ({
        vehicleType: vehicle.vehicleType,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year ?? undefined,
        registrationNo: vehicle.registrationNo,
        color: vehicle.color ?? "",
        engineNo: vehicle.engineNo ?? "",
        chassisNo: vehicle.chassisNo ?? "",
        purchasedFrom: vehicle.purchasedFrom,
        purchasedFromPhone: vehicle.purchasedFromPhone ?? "",
        datePurchased: toDateStr(vehicle.datePurchased),
        purchasePrice: vehicle.purchasePrice,
        fundingSource: vehicle.fundingSource,
        status: safeStatus(vehicle.status),
        remarks: vehicle.remarks ?? "",
        notes: vehicle.notes ?? "",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const form = useForm({ resolver: zodResolver(editBasicInfoSchema) as any, defaultValues: defaultVals() });

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (open) form.reset(defaultVals()); }, [open]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof editBasicInfoSchema>) => {
            setTid(toast.loading("Saving changes..."));
            return axios.put(`/vehicles/${vehicle._id}`, values);
        },
        onSuccess: () => {
            toast.success("Vehicle updated!", { id: tid });
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle._id] });
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            setOpen(false);
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Update failed", { id: tid, description: formatApiErrors(e?.errors) || e?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs border-border text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3 w-3" /> Edit
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-2xl p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                            <Pencil className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">Edit Basic Information</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model} &mdash; {vehicle.registrationNo}</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit((v) => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {/* ── Vehicle Identity ── */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle Identity</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <FormField control={form.control} name="vehicleType" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Type *</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="two_wheeler">Two Wheeler</SelectItem>
                                                    <SelectItem value="four_wheeler">Four Wheeler</SelectItem>
                                                </SelectContent>
                                            </Select><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="make" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Make *</FormLabel>
                                            <FormControl><Input className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="model" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Model *</FormLabel>
                                            <FormControl><Input className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <FormField control={form.control} name="year" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Year</FormLabel>
                                            <FormControl><Input type="number" placeholder="2022" className="h-9 bg-muted/50 border-border text-sm"
                                                value={field.value ?? ""}
                                                onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="registrationNo" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Reg. No. *</FormLabel>
                                            <FormControl><Input className="h-9 bg-muted/50 border-border text-sm uppercase" {...field}
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="color" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Color</FormLabel>
                                            <FormControl><Input placeholder="Red" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="status" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue placeholder="Keep current" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="in_stock">In Stock</SelectItem>
                                                    <SelectItem value="reconditioning">Reconditioning</SelectItem>
                                                    <SelectItem value="ready_for_sale">Ready for Sale</SelectItem>
                                                </SelectContent>
                                            </Select></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="engineNo" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Engine No.</FormLabel>
                                            <FormControl><Input className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="chassisNo" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Chassis No.</FormLabel>
                                            <FormControl><Input className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* ── Purchase Info ── */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Purchase Information</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="purchasedFrom" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Seller Name *</FormLabel>
                                            <FormControl><Input className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="purchasedFromPhone" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Seller Phone</FormLabel>
                                            <FormControl><Input placeholder="+91 9876543210" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField control={form.control} name="datePurchased" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Date Purchased *</FormLabel>
                                            <FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="purchasePrice" render={({ field }) => (
                                        <FormItem><FormLabel className="text-xs font-semibold">Purchase Price ₹ *</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                    <Input type="number" min="0" className="h-9 bg-muted/50 border-border pl-7 text-sm"
                                                        value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* ── Notes ── */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes & Remarks</p>
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold">Remarks</FormLabel>
                                        <FormControl><Textarea placeholder="Any remarks..." rows={2} className="resize-none bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold">Internal Notes</FormLabel>
                                        <FormControl><Textarea placeholder="Internal notes..." rows={2} className="resize-none bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="border-t border-border bg-muted/20 p-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Delete Payment Dialog ─────────────────────────────────
const DeletePaymentDialog = ({ type, payment, onDelete }: { type: "purchase" | "sale"; payment: { amount: number; mode: string }; onDelete: () => void }) => {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" title="Delete payment">
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[96vw] max-w-sm rounded-3xl bg-card border-border p-0 overflow-hidden gap-0 sm:w-full shadow-2xl">
                {/* Glassmorphic Danger Header */}
                <div className="relative overflow-hidden bg-red-500/5 border-b border-red-500/10 px-6 pt-6 pb-5">
                    <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-red-500/20 blur-[40px] pointer-events-none" />
                    <div className="relative flex flex-col items-center text-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-inner">
                            <Trash2 className="h-6 w-6 text-red-500 drop-shadow-sm" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-foreground text-lg font-bold leading-tight">
                                Delete Payment
                            </AlertDialogTitle>
                            <p className="text-xs text-muted-foreground mt-1">This action cannot be undone</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <div className="rounded-xl border border-border bg-muted/30 p-4 text-center">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{type} PAYMENT</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">via {payment.mode}</p>
                    </div>
                    <AlertDialogDescription className="text-sm text-center text-muted-foreground leading-relaxed">
                        Are you sure you want to permanently remove this payment record from the timeline?
                    </AlertDialogDescription>
                </div>

                <AlertDialogFooter className="px-6 pb-6 pt-0 flex-col sm:flex-row gap-3">
                    <AlertDialogCancel className="w-full sm:w-1/2 border-border hover:bg-muted m-0">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onDelete}
                        className="w-full sm:w-1/2 bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 m-0"
                    >
                        Delete Payment
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ── Delete Vehicle Dialog ─────────────────────────────────
const DeleteVehicleDialog = ({ vehicle }: { vehicle: IVehicle }) => {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const confirmKey = vehicle.registrationNo;
    const isConfirmed = confirmText.trim().toUpperCase() === confirmKey.toUpperCase();

    const { mutate, isPending } = useMutation({
        mutationFn: () => axios.delete(`/vehicles/${vehicle._id}`),
        onSuccess: () => {
            toast.success(`${vehicle.make} ${vehicle.model} deleted successfully`);
            router.push("/vehicles");
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error(e?.message ?? "Failed to delete vehicle");
        },
    });

    // Reset confirm text when dialog opens
    useEffect(() => {
        if (open) {
            setConfirmText("");
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 transition-all"
                    title="Delete vehicle"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="w-[96vw] max-w-md rounded-3xl bg-card border-border p-0 overflow-hidden gap-0 sm:w-full shadow-2xl">
                {/* Red danger header */}
                <div className="relative overflow-hidden bg-red-500/5 border-b border-red-500/10 px-6 pt-6 pb-5">
                    <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-red-500/20 blur-[40px] pointer-events-none" />
                    <div className="relative flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 shadow-inner">
                            <Trash2 className="h-5 w-5 text-red-500 drop-shadow-sm" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-foreground text-lg font-bold leading-tight">
                                Delete Vehicle
                            </AlertDialogTitle>
                            <p className="text-xs text-muted-foreground mt-1">Permanent & irreversible action</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-5">
                    {/* Vehicle info pill */}
                    <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-border px-4 py-3 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-inner text-white">
                            {vehicle.vehicleType === "two_wheeler" ? <Bike className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">{vehicle.make} {vehicle.model}{vehicle.year ? ` (${vehicle.year})` : ""}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{vehicle.registrationNo}</p>
                        </div>
                    </div>

                    <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                        Deleting this vehicle will permanently remove all associated data including purchase payments, sale records, costs, and activity history.
                    </AlertDialogDescription>

                    {/* Confirm input */}
                    <div className="space-y-2.5">
                        <p className="text-xs font-medium text-foreground">
                            Type <span className="font-mono font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">{confirmKey}</span> to confirm
                        </p>
                        <input
                            ref={inputRef}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && isConfirmed && !isPending && mutate()}
                            placeholder={`Type ${confirmKey} here...`}
                            className={cn(
                                "w-full rounded-xl border bg-background px-4 py-2.5 text-sm font-mono outline-none transition-all shadow-sm",
                                "placeholder:text-muted-foreground/50",
                                isConfirmed
                                    ? "border-red-500/60 ring-4 ring-red-500/10 text-red-500 font-bold"
                                    : "border-border focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10"
                            )}
                        />
                    </div>

                    {/* Warning banner */}
                    <div className="flex items-start gap-3 rounded-xl bg-red-500/5 border border-red-500/20 p-3.5">
                        <span className="text-red-500 mt-0.5 shrink-0 text-base leading-none">⚠️</span>
                        <p className="text-xs text-red-500/90 font-medium leading-relaxed">
                            This cannot be undone. All records including payments, costs, sale history and activity logs will be permanently deleted.
                        </p>
                    </div>
                </div>

                <AlertDialogFooter className="px-6 pb-6 pt-0 flex-col sm:flex-row gap-3">
                    <AlertDialogCancel
                        onClick={() => setOpen(false)}
                        className="w-full sm:w-1/2 border-border hover:bg-muted m-0"
                        disabled={isPending}
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => mutate()}
                        disabled={!isConfirmed || isPending}
                        className="w-full sm:w-1/2 bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 disabled:opacity-40 m-0"
                    >
                        {isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
                        ) : (
                            <><Trash2 className="h-4 w-4 mr-2" />Delete Vehicle</>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ── Export Detail Button ──────────────────────────────────────────
const ExportDetailButton = ({ vehicleId, vehicleName }: { vehicleId: string; vehicleName: string }) => {
    const [isExporting, setIsExporting] = useState<"pdf" | "csv" | null>(null);

    const handleExport = async (format: "pdf" | "csv") => {
        setIsExporting(format);
        try {
            const baseURL = (axios.defaults.baseURL ?? "").replace(/\/$/, "");
            const url = `${baseURL}/vehicles/${vehicleId}/export?format=${format}`;
            const token = getClientSession();
            const res = await fetch(url, {
                credentials: "include",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error("Export failed");
            const blob = await res.blob();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `${vehicleName}_${new Date().toISOString().slice(0, 10)}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
            toast.success(`${format.toUpperCase()} downloaded successfully`);
        } catch {
            toast.error("Export failed. Please try again.");
        } finally {
            setIsExporting(null);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-border text-muted-foreground hover:text-foreground" disabled={!!isExporting}>
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Export
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Download as</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={() => handleExport("pdf")} disabled={isExporting === "pdf"} className="gap-2 cursor-pointer">
                    <FileText className="h-4 w-4 text-red-400" />
                    <div>
                        <p className="text-sm font-medium">Export PDF</p>
                        <p className="text-[10px] text-muted-foreground">Full detail report</p>
                    </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("csv")} disabled={isExporting === "csv"} className="gap-2 cursor-pointer">
                    <FileSpreadsheet className="h-4 w-4 text-green-400" />
                    <div>
                        <p className="text-sm font-medium">Export CSV</p>
                        <p className="text-[10px] text-muted-foreground">Open in Excel / Sheets</p>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

// ── Revert Sale Button ───────────────────────────────────────────
const RevertSaleButton = ({ vehicle, size = "default" }: { vehicle: IVehicle; size?: "default" | "sm" }) => {
    const [tid, setTid] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const { mutate, isPending } = useMutation({
        mutationFn: async () => {
            setTid(toast.loading("Reverting sale..."));
            return axios.delete(`/vehicles/${vehicle._id}/sale`);
        },
        onSuccess: () => {
            toast.success("Sale reverted. Vehicle is back in stock.", { id: tid });
            queryClient.invalidateQueries({ queryKey: ["vehicle", vehicle._id] });
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            // Invalidate consignments — a migrated consignment may have been restored
            queryClient.invalidateQueries({ queryKey: ["consignments"] });
        },
        onError: (err: unknown) => {
            const e = (err as AxiosError)?.response?.data as ErrorData;
            toast.error("Failed to revert sale", { id: tid, description: e?.message });
        },
    });

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {size === "sm" ? (
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                        <RotateCcw className="h-3 w-3" /> Revert Sale
                    </Button>
                ) : (
                    <Button variant="outline" className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Revert Sale
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[96vw] max-w-md rounded-3xl bg-card border-border p-0 overflow-hidden gap-0 sm:w-full shadow-2xl">
                {/* Red danger header */}
                <div className="relative overflow-hidden bg-orange-500/5 border-b border-orange-500/10 px-6 pt-6 pb-5">
                    <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-orange-500/20 blur-[40px] pointer-events-none" />
                    <div className="relative flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/20 shadow-inner">
                            <RotateCcw className="h-5 w-5 text-orange-500 drop-shadow-sm" />
                        </div>
                        <div>
                            <AlertDialogTitle className="text-foreground text-lg font-bold leading-tight">
                                Revert Sale
                            </AlertDialogTitle>
                            <p className="text-xs text-muted-foreground mt-1">Undo vehicle sale transaction</p>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-6 space-y-4">
                    <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                        This will permanently undo the sale of <strong className="text-foreground">{vehicle.make} {vehicle.model}</strong> and restore it to <strong className="text-foreground">In Stock</strong>.
                    </AlertDialogDescription>

                    {/* Warning banner */}
                    <div className="flex items-start gap-3 rounded-xl bg-orange-500/5 border border-orange-500/20 p-3.5">
                        <span className="text-orange-500 mt-0.5 shrink-0 text-base leading-none">⚠️</span>
                        <p className="text-xs text-orange-500/90 font-medium leading-relaxed">
                            All recorded sale payments and related exchange entries for this vehicle will be completely cleared. This action cannot be undone.
                        </p>
                    </div>
                </div>

                <AlertDialogFooter className="px-6 pb-6 pt-0 flex-col sm:flex-row gap-3">
                    <AlertDialogCancel className="w-full sm:w-1/2 border-border hover:bg-muted m-0">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => mutate()}
                        className="w-full sm:w-1/2 bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 m-0"
                    >
                        {isPending ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Reverting...</>
                        ) : (
                            <><RotateCcw className="h-4 w-4 mr-2" />Revert Sale</>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ── Main Vehicle Detail Component ─────────────────────────────────
const VehicleDetail = ({ id, initialData }: { id: string; initialData: IVehicle | null }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [animateProgress, setAnimateProgress] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        const timer = setTimeout(() => setAnimateProgress(true), 150);
        return () => clearTimeout(timer);
    }, []);

    const scrollToTabs = () => {
        document.getElementById("vehicle-detail-tabs")?.scrollIntoView({ behavior: "smooth" });
    };

    const handlePurchaseClick = () => {
        setActiveTab("purchase-payments");
        setTimeout(scrollToTabs, 50);
    };

    const handleSaleClick = () => {
        setActiveTab("sale");
        setTimeout(scrollToTabs, 50);
    };

    const { data: vehicle } = useQuery<IVehicle | null>({
        queryKey: ["vehicle", id],
        queryFn: () => fetchVehicle(id),
        initialData,
        retry: 0,
    });

    const { mutate: deletePayment } = useMutation({
        mutationFn: async ({ type, paymentId }: { type: "purchase" | "sale"; paymentId: string }) => {
            return axios.delete(`/vehicles/${id}/${type === "purchase" ? "purchase-payments" : "sale-payments"}/${paymentId}`);
        },
        onSuccess: () => {
            toast.success("Payment deleted");
            queryClient.invalidateQueries({ queryKey: ["vehicle", id] });
            // Invalidate lists — a sale payment delete may deactivate an exchange vehicle
            // or restore a consignment, so both lists need refreshing
            queryClient.invalidateQueries({ queryKey: ["vehicles"] });
            queryClient.invalidateQueries({ queryKey: ["consignments"] });
        },
    });


    if (!vehicle) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">Vehicle not found</p>
            <Link href="/vehicles"><Button variant="outline">Back to Inventory</Button></Link>
        </div>
    );

    const isSold = !!(vehicle.dateSold && vehicle.soldPrice);
    const pl = vehicle.profitLoss;
    const isProfit = pl >= 0;
    const VehicleIcon = vehicle.vehicleType === "two_wheeler" ? Bike : Car;

    // Payment progress calculations
    const purchasePaid = vehicle.purchasePrice - vehicle.purchasePendingAmount;
    const purchasePct = vehicle.purchasePrice > 0 ? Math.min(100, Math.max(0, (purchasePaid / vehicle.purchasePrice) * 100)) : 0;
    const salePct = isSold && vehicle.soldPrice && vehicle.soldPrice > 0 
        ? Math.min(100, Math.max(0, (vehicle.receivedAmount / vehicle.soldPrice) * 100)) 
        : 0;

    const hasExchangeActivity = vehicle.isExchange || vehicle.isFromExchange ||
        vehicle.salePayments.some(p => p.type === "exchange");

    const tabs = [
        { id: "overview", label: "Overview", icon: Package },
        { id: "costs", label: "Costs", icon: FileText },
        { id: "purchase-payments", label: "Purchase Payments", icon: ShoppingCart },
        { id: "sale", label: "Sale & Payments", icon: DollarSign },
        ...(hasExchangeActivity ? [{ id: "exchange", label: "Exchange", icon: ArrowLeftRight }] : []),
        { id: "activity", label: "Activity Log", icon: Activity },
    ];


    return (
        <div className="flex w-full flex-col gap-5 pb-10">
            {/* Back */}
            <Link href="/vehicles" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                <ArrowLeft className="h-4 w-4" /> Back to Inventory
            </Link>

            {/* Hero Card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="glass-header relative p-5 sm:p-6">
                    <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
                    <div className="relative flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                            <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-brand shadow-lg shrink-0 mt-1 sm:mt-0">
                                <VehicleIcon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                    <span className="text-[10px] sm:text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-md">{vehicle.vehicleId}</span>
                                    <VehicleStatusBadge status={vehicle.status} />
                                    {vehicle.saleStatus && <VehicleStatusBadge saleStatus={vehicle.saleStatus} />}
                                    {vehicle.isExchange && (
                                        <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[9px] sm:text-[10px]">
                                            <ArrowLeftRight className="mr-1 h-2.5 w-2.5" />Sold via Exchange
                                        </Badge>
                                    )}
                                    {vehicle.isFromExchange && (
                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] sm:text-[10px]">
                                            <ArrowLeftRight className="mr-1 h-2.5 w-2.5" />From Exchange
                                        </Badge>
                                    )}
                                    {vehicle.purchasePaymentStatus === "paid" ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] sm:text-[10px]">
                                            💵 Purchase Paid
                                        </Badge>
                                    ) : vehicle.purchasePaymentStatus === "partial" ? (
                                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[9px] sm:text-[10px]">
                                            💵 Purchase Partial ({formatCurrency(vehicle.purchasePendingAmount)} due)
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] sm:text-[10px]">
                                            💵 Purchase Unpaid
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{vehicle.make} {vehicle.model}</h1>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px] sm:text-xs mr-2">{vehicle.registrationNo}</span>
                                    Purchased {formatDate(vehicle.datePurchased)} from <strong className="text-foreground">{vehicle.purchasedFrom}</strong>
                                </p>
                            </div>
                        </div>
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0 flex-wrap">
                            {/* Export dropdown — available to all roles */}
                            <ExportDetailButton vehicleId={vehicle._id} vehicleName={`${vehicle.make}_${vehicle.model}`} />
                            {/* Write actions — admin only */}
                            <AdminOnly>
                                {!isSold ? (
                                    <RecordSaleDialog vehicle={vehicle} />
                                ) : (
                                    <RevertSaleButton vehicle={vehicle} />
                                )}
                                {/* Delete */}
                                <DeleteVehicleDialog vehicle={vehicle} />
                            </AdminOnly>
                        </div>
                    </div>
                </div>

                {/* Exchange callout banners */}
                {vehicle.isExchange && (
                    <div className="mx-0 border-t border-orange-500/20 bg-orange-500/5 px-5 py-3 flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15">
                            <ArrowLeftRight className="h-3.5 w-3.5 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-orange-400">Sold via Exchange</p>
                            <p className="text-[11px] text-muted-foreground">This vehicle was sold with an exchange vehicle as part of the payment. See the <strong className="text-foreground">Exchange</strong> tab for full settlement details.</p>
                        </div>
                        <button onClick={() => setActiveTab("exchange")} className="shrink-0 text-[11px] font-semibold text-orange-400 hover:underline">
                            View Exchange →
                        </button>
                    </div>
                )}
                {vehicle.isFromExchange && vehicle.exchangeSourceRef && (
                    <div className="mx-0 border-t border-amber-500/20 bg-amber-500/5 px-5 py-3 flex items-center gap-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                            <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-amber-400">Entered via Exchange</p>
                            <p className="text-[11px] text-muted-foreground">This vehicle entered your inventory as a trade-in from a buyer. See the <strong className="text-foreground">Exchange</strong> tab for origin details.</p>
                        </div>
                        <Link href={`/${vehicle.exchangeSourceCollection === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeSourceRef}`}
                            className="shrink-0 text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> Source Vehicle
                        </Link>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-y border-border">
                    {[
                        { label: "Purchase Price", value: formatCurrency(vehicle.purchasePrice), sub: "Original cost" },
                        { label: "Total Investment", value: formatCurrency(vehicle.totalInvestment), sub: "Incl. reconditioning" },
                        { label: isSold ? "Sold Price" : "Status", value: isSold ? formatCurrency(vehicle.soldPrice!) : vehicle.status.replace("_", " "), sub: isSold ? `To: ${vehicle.soldTo}` : "Current status" },
                        {
                            label: isSold ? "Profit / Loss" : "P&L (Unrealized)",
                            value: formatCurrency(Math.abs(pl)),
                            sub: `${isProfit ? "+" : "-"}${Math.abs(vehicle.profitLossPercentage).toFixed(1)}%`,
                            highlight: isSold ? (isProfit ? "profit" : "loss") : "neutral",
                        },
                    ].map((stat) => (
                        <div key={stat.label} className="p-4 flex flex-col gap-1 bg-card">
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">{stat.label}</p>
                            <p className={cn("text-base sm:text-lg font-bold", stat.highlight === "profit" ? "text-emerald-400" : stat.highlight === "loss" ? "text-red-400" : "text-foreground")}>
                                {stat.highlight === "profit" && <TrendingUp className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />}
                                {stat.highlight === "loss" && <TrendingDown className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />}
                                {stat.value}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground">{stat.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Unified Payment Progress Bars */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border border-t border-border bg-muted/5">
                    {/* Purchase Payment to Seller */}
                    <div 
                        onClick={handlePurchaseClick}
                        className={cn(
                            "p-5 flex flex-col gap-2.5 transition-all duration-300 hover:bg-muted/20 cursor-pointer relative group bg-gradient-to-br from-card to-background/50",
                            purchasePct === 100 ? "hover:border-l-4 hover:border-l-emerald-500" : "hover:border-l-4 hover:border-l-amber-500"
                        )}
                    >
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] sm:text-[10px] flex items-center gap-1.5">
                                <ShoppingCart className="h-3.5 w-3.5 text-primary shrink-0" />
                                Purchase Payment Progress
                            </span>
                            <span className="font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 font-mono text-[10px]">
                                {purchasePct.toFixed(0)}%
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-baseline mt-1">
                            <p className="text-xl sm:text-2xl font-bold text-foreground">
                                {formatCurrency(purchasePaid)}
                                <span className="text-xs font-normal text-muted-foreground ml-1">paid of {formatCurrency(vehicle.purchasePrice)}</span>
                            </p>
                            <span className="text-[10px] text-primary group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                                Manage <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                        </div>

                        <div className="h-2 bg-muted/40 rounded-full overflow-hidden relative shadow-inner">
                            <div 
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out shadow-sm", 
                                    purchasePct === 100 
                                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                        : "bg-gradient-to-r from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                                )} 
                                style={{ width: `${animateProgress ? purchasePct : 0}%` }} 
                            />
                        </div>

                        <div className="flex items-center justify-between mt-0.5">
                            {vehicle.purchasePendingAmount > 0 ? (
                                <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                                    <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                                    {formatCurrency(vehicle.purchasePendingAmount)} balance remaining due to seller
                                </p>
                            ) : (
                                <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    Fully paid to seller
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Sale Payment from Buyer */}
                    <div 
                        onClick={handleSaleClick}
                        className={cn(
                            "p-5 flex flex-col gap-2.5 transition-all duration-300 hover:bg-muted/20 cursor-pointer relative group bg-gradient-to-br from-card to-background/50",
                            !isSold ? "hover:border-l-4 hover:border-l-muted" : salePct === 100 ? "hover:border-l-4 hover:border-l-emerald-500" : "hover:border-l-4 hover:border-l-blue-500"
                        )}
                    >
                        <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[9px] sm:text-[10px] flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5 text-success shrink-0" />
                                Sale Payment Progress
                            </span>
                            <span className="font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/40 font-mono text-[10px]">
                                {isSold ? `${salePct.toFixed(0)}%` : "N/A"}
                            </span>
                        </div>
                        
                        <div className="flex justify-between items-baseline mt-1">
                            <div className="text-xl sm:text-2xl font-bold text-foreground">
                                {isSold ? (
                                    <>
                                        {formatCurrency(vehicle.receivedAmount)}
                                        <span className="text-xs font-normal text-muted-foreground ml-1">received of {formatCurrency(vehicle.soldPrice!)}</span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground text-lg sm:text-xl font-semibold">Not Sold Yet</span>
                                )}
                            </div>
                            <span className="text-[10px] text-success group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                                {isSold ? "Manage" : "Record Sale"} <ExternalLink className="h-2.5 w-2.5" />
                            </span>
                        </div>

                        <div className="h-2 bg-muted/40 rounded-full overflow-hidden relative shadow-inner">
                            <div 
                                className={cn(
                                    "h-full rounded-full transition-all duration-1000 ease-out shadow-sm", 
                                    !isSold 
                                        ? "bg-muted/30" 
                                        : salePct === 100 
                                            ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                                            : "bg-gradient-to-r from-blue-500 to-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                )} 
                                style={{ width: `${animateProgress ? (isSold ? salePct : 0) : 0}%` }} 
                            />
                        </div>

                        <div className="flex items-center justify-between mt-0.5">
                            {isSold ? (
                                vehicle.balanceAmount > 0 ? (
                                    <p className="text-[10px] text-red-400 font-medium flex items-center gap-1">
                                        <span className="animate-pulse h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                                        {formatCurrency(vehicle.balanceAmount)} outstanding balance from buyer
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                        Fully collected from buyer
                                    </p>
                                )
                            ) : (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-muted/40 shrink-0" />
                                    Awaiting vehicle sale to record buyer payments
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div id="vehicle-detail-tabs" className="flex gap-0 border-b border-border overflow-x-auto scroll-mt-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={cn("flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
                                activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                            <Icon className="h-4 w-4" />{tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vehicle Details</p>
                            <AdminOnly><EditBasicInfoDialog vehicle={vehicle} /></AdminOnly>
                        </div>
                        {[
                            { label: "Make & Model", value: `${vehicle.make} ${vehicle.model}` },
                            { label: "Year", value: vehicle.year?.toString() || "—" },
                            { label: "Registration No", value: vehicle.registrationNo },
                            { label: "Color", value: vehicle.color || "—" },
                            { label: "Engine No", value: vehicle.engineNo || "—" },
                            { label: "Chassis No", value: vehicle.chassisNo || "—" },
                        ].map((r) => (
                            <div key={r.label} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground">{r.label}</span>
                                <span className="font-medium text-foreground text-right">{r.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Exchange Source Info */}
                    {vehicle.isFromExchange && vehicle.exchangeSourceRef && (
                        <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Exchange Origin</p>
                            <p className="text-sm text-muted-foreground">This vehicle entered inventory via an exchange deal.</p>
                            {vehicle.exchangeDetails && <p className="text-sm text-foreground">{vehicle.exchangeDetails}</p>}
                            <Link href={`/${vehicle.exchangeSourceCollection === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeSourceRef}`}
                                className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:underline">
                                <ExternalLink className="h-3 w-3" /> View Source Vehicle
                            </Link>
                        </div>
                    )}

                    {isSold && (
                        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sale Details</p>
                            {[
                                { label: "Date Sold", value: vehicle.dateSold ? formatDate(vehicle.dateSold) : "—" },
                                { label: "Sold To", value: vehicle.soldTo || "—" },
                                { label: "Buyer Phone", value: vehicle.soldToPhone || "—" },
                                { label: "Sold Price", value: formatCurrency(vehicle.soldPrice!) },
                                { label: "Days to Sell", value: vehicle.daysToSell != null ? `${vehicle.daysToSell} days` : "—" },
                                { label: "NOC Status", value: vehicle.nocStatus.replace("_", " ") },
                                { label: "Sale Status", value: vehicle.saleStatus?.replace("_", " ") || "—" },
                            ].map((r) => (
                                <div key={r.label} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-muted-foreground">{r.label}</span>
                                    <span className="font-medium text-foreground text-right">{r.value}</span>
                                </div>
                            ))}
                            {/* Exchange vehicle created from this sale — FIXED link */}
                            {vehicle.isExchange && vehicle.exchangeVehicleRef && (() => {
                                const epWithRef = vehicle.salePayments.find(p => p.exchangeCreatedRef);
                                const createdIn = epWithRef?.exchangeCreatedIn || "vehicles";
                                return (
                                    <div className="mt-2 pt-2 border-t border-orange-500/20">
                                        <p className="text-xs text-orange-400 font-semibold mb-1">Exchange Vehicle Created</p>
                                        <Link href={`/${createdIn === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeVehicleRef}`}
                                            className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:underline">
                                            <ExternalLink className="h-3 w-3" /> View Exchange Vehicle
                                        </Link>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                    {vehicle.remarks && (
                        <div className="rounded-xl border border-border bg-card p-5 sm:col-span-2">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Remarks</p>
                            <p className="text-sm text-foreground">{vehicle.remarks}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Costs Tab */}
            {activeTab === "costs" && <CostsTab vehicle={vehicle} />}

            {/* Purchase Payments Tab */}
            {activeTab === "purchase-payments" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-foreground">Purchase Payments</p>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center">
                                Status: <Badge variant={vehicle.purchasePaymentStatus === "paid" ? "default" : "secondary"} className="ml-1 text-[10px]">
                                    {vehicle.purchasePaymentStatus.toUpperCase()}
                                </Badge>
                                {vehicle.purchasePendingAmount > 0 && <span className="ml-2 text-orange-400">Pending: {formatCurrency(vehicle.purchasePendingAmount)}</span>}
                            </div>
                        </div>
                        <AdminOnly>
                            {vehicle.purchasePendingAmount > 0 ? (
                                <AddPurchasePaymentDialog vehicle={vehicle} />
                            ) : (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold shadow-inner select-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
                                    Fully Paid
                                </div>
                            )}
                        </AdminOnly>
                    </div>
                    {vehicle.purchasePayments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">No purchase payments recorded yet</div>
                    ) : (
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            {vehicle.purchasePayments.map((p, i) => (
                                <div key={p._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{formatCurrency(p.amount)} <span className="text-xs font-normal text-muted-foreground">via {p.mode}</span></p>
                                            <p className="text-xs text-muted-foreground">{formatDate(p.date)}{p.bankAccount && ` — ${p.bankAccount}`}{p.notes && ` — ${p.notes}`}</p>
                                        </div>
                                    </div>
                                    <AdminOnly><DeletePaymentDialog type="purchase" payment={p} onDelete={() => deletePayment({ type: "purchase", paymentId: p._id })} /></AdminOnly>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Sale & Payments Tab */}
            {activeTab === "sale" && (
                <div className="space-y-4">
                    {!isSold ? (
                        <div className="rounded-xl border border-dashed border-border p-10 text-center">
                            <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground mb-4">This vehicle has not been sold yet.</p>
                            <AdminOnly><RecordSaleDialog vehicle={vehicle} /></AdminOnly>
                        </div>
                    ) : (
                        <>
                            {/* Revert Sale action bar — admin only */}
                            <AdminOnly>
                                <div className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                                    <div>
                                        <p className="text-xs font-bold text-red-400">Sale Recorded</p>
                                        <p className="text-[11px] text-muted-foreground mt-0.5">Made a mistake? You can revert this sale and restore the vehicle to stock.</p>
                                    </div>
                                    <RevertSaleButton vehicle={vehicle} size="sm" />
                                </div>
                            </AdminOnly>
                            {/* Sale Summary */}
                            <div className="rounded-xl border border-border bg-card p-5">
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Sale Summary</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { label: "Sold Price", value: formatCurrency(vehicle.soldPrice!), color: "text-foreground" },
                                        { label: "Received", value: formatCurrency(vehicle.receivedAmount), color: "text-emerald-400" },
                                        { label: "Balance", value: formatCurrency(vehicle.balanceAmount), color: vehicle.balanceAmount > 0 ? "text-red-400" : "text-emerald-400" },
                                        { label: "Profit/Loss", value: formatCurrency(Math.abs(pl)), color: isProfit ? "text-emerald-400" : "text-red-400" },
                                    ].map((s) => (
                                        <div key={s.label}>
                                            <p className="text-xs text-muted-foreground">{s.label}</p>
                                            <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Finance Disbursement Card ── */}
                            {(() => {
                                const vAny = vehicle as unknown as Record<string, unknown>;
                                const finCo = vAny.financeCompany as string | undefined;
                                const finAmt = vAny.financeAmount as number | undefined;
                                const finStatus = vAny.financeStatus as string | undefined;
                                const finPayments = vehicle.salePayments.filter(p => p.mode === "Finance");
                                const actualDisbursements = finPayments.filter(p => p.amount > 0);
                                const disbursed = actualDisbursements.reduce((s, p) => s + p.amount, 0);
                                const finBalance = finAmt ? Math.max(0, finAmt - disbursed) : 0;
                                const pct = finAmt && finAmt > 0 ? Math.min(100, (disbursed / finAmt) * 100) : 0;
                                if (!finCo && finPayments.length === 0) return null;
                                return (
                                    <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">💳</span>
                                                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Finance Disbursement</p>
                                            </div>
                                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                                finStatus === "disbursed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                finStatus === "partial" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                            )}>
                                                {finStatus === "disbursed" ? "Fully Disbursed ✓" : finStatus === "partial" ? `Partial (${actualDisbursements.length} tranche${actualDisbursements.length !== 1 ? "s" : ""})` : "Awaiting Disbursement"}
                                            </span>
                                        </div>
                                        {actualDisbursements.length > 0 && (
                                            <div className="space-y-1.5 pb-2 border-b border-blue-500/10">
                                                {actualDisbursements.map((p, i) => {
                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                    const pAny2 = p as any;
                                                    return (
                                                        <div key={p._id} className="flex justify-between items-center text-xs">
                                                            <span className="text-muted-foreground">
                                                                Tranche {i + 1} · {formatDate(p.date)}
                                                                {pAny2.loanRef && <span className="ml-1.5 text-blue-400/60 font-mono text-[10px]">({pAny2.loanRef})</span>}
                                                            </span>
                                                            <span className="font-semibold text-emerald-400">+{formatCurrency(p.amount)}</span>
                                                        </div>
                                                    );
                                                })}
                                                {actualDisbursements.length > 1 && (
                                                    <div className="flex items-center justify-between text-xs pt-1 font-bold border-t border-blue-500/10">
                                                        <span className="text-blue-300">Total</span>
                                                        <span className="text-emerald-400">{formatCurrency(disbursed)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-3 text-sm">
                                            {finCo && <div><p className="text-[10px] text-muted-foreground">Finance Company</p><p className="font-semibold text-foreground">{finCo}</p></div>}
                                            {finAmt && finAmt > 0 && <div><p className="text-[10px] text-muted-foreground">Sanctioned Loan</p><p className="font-semibold text-foreground">{formatCurrency(finAmt)}</p></div>}
                                            <div>
                                                <p className="text-[10px] text-muted-foreground">Total Disbursed</p>
                                                <p className="font-semibold text-emerald-400">{actualDisbursements.length > 0 ? formatCurrency(disbursed) : "None yet"}</p>
                                            </div>
                                            {finAmt && finAmt > 0 && <div><p className="text-[10px] text-muted-foreground">Pending</p><p className={cn("font-semibold", finBalance > 0 ? "text-amber-400" : "text-emerald-400")}>{formatCurrency(finBalance)}</p></div>}
                                        </div>
                                        {finAmt && finAmt > 0 && (
                                            <div>
                                                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                                    <span>Disbursement Progress</span><span>{pct.toFixed(0)}%</span>
                                                </div>
                                                <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Payment Timeline */}
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-foreground">Payment Timeline</p>
                                <AdminOnly>
                                    {vehicle.balanceAmount > 0 ? (
                                        <AddSalePaymentDialog vehicle={vehicle} />
                                    ) : (
                                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-semibold shadow-inner select-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0"><path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" /></svg>
                                            Fully Collected
                                        </div>
                                    )}
                                </AdminOnly>
                            </div>
                            {vehicle.salePayments.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">No payments recorded yet</div>
                            ) : (
                                <div className="rounded-xl border border-border bg-card overflow-hidden">
                                    {vehicle.salePayments.map((p, i) => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const pAny = p as any;
                                        const isFinanceInit = p.mode === "Finance" && p.amount === 0;
                                        return (
                                        <div key={p._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                            <div className="flex items-center gap-4">
                                                {isFinanceInit ? (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs">
                                                        <span>⏳</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-emerald-400 text-xs font-bold">
                                                        {vehicle.salePayments.filter(x => x.amount > 0).indexOf(p) + 1 || "—"}
                                                    </div>
                                                )}
                                                <div>
                                                    {isFinanceInit ? (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-blue-400">Finance Initialized</p>
                                                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">💳 Awaiting Disbursement</Badge>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(p.amount)} <span className="text-xs font-normal text-muted-foreground">via {p.type === "exchange" ? "Exchange" : p.mode}</span></p>
                                                            {p.type === "exchange" && (
                                                                <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">
                                                                    <ArrowLeftRight className="mr-1 h-2.5 w-2.5" />Exchange
                                                                </Badge>
                                                            )}
                                                            {p.mode === "Finance" && (
                                                                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]">💳 Finance</Badge>
                                                            )}
                                                            {p.exchangeCreatedRef && p.exchangeCreatedIn && (
                                                                <Link href={`/${p.exchangeCreatedIn === "vehicles" ? "vehicles" : "consignments"}/${p.exchangeCreatedRef}`}
                                                                    className="inline-flex items-center gap-1 text-[10px] text-orange-400 hover:underline"
                                                                    onClick={e => e.stopPropagation()}>
                                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                                    {p.exchangeCreatedIn === "vehicles" ? "View Vehicle" : "View Consignment"}
                                                                </Link>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(p.date)}
                                                        {pAny.financeCompany && ` — ${pAny.financeCompany}`}
                                                        {pAny.loanRef && ` (Loan: ${pAny.loanRef})`}
                                                        {p.referenceNo && ` — Ref: ${p.referenceNo}`}
                                                        {p.notes && ` — ${p.notes}`}
                                                    </p>
                                                    {p.exchangeVehicleMake && (
                                                        <p className="text-[11px] text-orange-400/80 mt-0.5">
                                                            {p.exchangeVehicleMake} {p.exchangeVehicleRegNo ? `(${p.exchangeVehicleRegNo})` : ""}
                                                            {p.exchangeDetails ? ` — ${p.exchangeDetails}` : ""}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <AdminOnly><DeletePaymentDialog type="sale" payment={p} onDelete={() => deletePayment({ type: "sale", paymentId: p._id })} /></AdminOnly>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ── Exchange Tab ── */}
            {activeTab === "exchange" && (
                <div className="space-y-4">
                    {/* Exchange Origin — this vehicle came in via exchange */}
                    {vehicle.isFromExchange && vehicle.exchangeSourceRef && (
                        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 overflow-hidden">
                            <div className="px-5 py-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-2">
                                <ArrowLeftRight className="h-4 w-4 text-orange-400" />
                                <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Exchange Origin</p>
                            </div>
                            <div className="p-5 space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    This vehicle entered your inventory as part of an <strong className="text-orange-400">exchange deal</strong> — it was received from a buyer in trade-in.
                                </p>
                                {vehicle.exchangeDetails && (
                                    <div className="rounded-lg bg-muted/40 border border-border p-3">
                                        <p className="text-xs text-muted-foreground font-semibold mb-1">Exchange Notes</p>
                                        <p className="text-sm text-foreground">{vehicle.exchangeDetails}</p>
                                    </div>
                                )}
                                <Link
                                    href={`/${vehicle.exchangeSourceCollection === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeSourceRef}`}
                                    className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-400 hover:underline"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Source Vehicle (the one that was sold)
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Exchange payments — settlement view */}
                    {vehicle.salePayments.some(p => p.type === "exchange") && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <div className="px-5 py-3 bg-muted/20 border-b border-border flex items-center gap-2">
                                <IndianRupee className="h-4 w-4 text-primary" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Exchange Settlement Breakdown</p>
                            </div>
                            <div className="p-5 space-y-5">
                                {vehicle.soldPrice && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Sold Price</span>
                                            <span className="font-bold text-foreground">{formatCurrency(vehicle.soldPrice)}</span>
                                        </div>
                                        {vehicle.salePayments.filter(p => p.type === "exchange").map(ep => (
                                            <div key={ep._id} className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <ArrowLeftRight className="h-3.5 w-3.5 text-orange-400" />
                                                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Exchange Vehicle</p>
                                                    <p className="text-[10px] text-muted-foreground ml-auto">{formatDate(ep.date)}</p>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground mb-0.5">Vehicle</p>
                                                        <p className="font-semibold text-foreground">{ep.exchangeVehicleMake || "—"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground mb-0.5">Reg No</p>
                                                        <p className="font-mono font-semibold text-foreground">{ep.exchangeVehicleRegNo || "—"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] text-muted-foreground mb-0.5">Exchange Value</p>
                                                        <p className="font-bold text-orange-400">{formatCurrency(ep.amount)}</p>
                                                    </div>
                                                    {ep.exchangeDetails && (
                                                        <div>
                                                            <p className="text-[11px] text-muted-foreground mb-0.5">Notes</p>
                                                            <p className="text-foreground text-xs">{ep.exchangeDetails}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                {ep.exchangeCreatedRef && ep.exchangeCreatedIn ? (
                                                    <div className="mt-3 pt-3 border-t border-orange-500/20">
                                                        <Link
                                                            href={`/${ep.exchangeCreatedIn === "vehicles" ? "vehicles" : "consignments"}/${ep.exchangeCreatedRef}`}
                                                            className="inline-flex items-center gap-1.5 text-xs font-medium text-orange-400 hover:underline"
                                                        >
                                                            <ExternalLink className="h-3 w-3" />
                                                            View in {ep.exchangeCreatedIn === "vehicles" ? "Vehicles" : "Consignments"} inventory
                                                        </Link>
                                                    </div>
                                                ) : (
                                                    <div className="mt-3 pt-3 border-t border-orange-500/10 flex items-center gap-1.5">
                                                        <span className="text-[10px] text-muted-foreground italic">Not added to inventory — recorded for reference only</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Cash Payments</p>
                                            {vehicle.salePayments.filter(p => p.type !== "exchange").length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No cash payments recorded</p>
                                            ) : (
                                                vehicle.salePayments.filter(p => p.type !== "exchange").map((cp, i) => (
                                                    <div key={cp._id} className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Payment {i + 1} ({cp.mode}) · {formatDate(cp.date)}</span>
                                                        <span className="font-semibold text-emerald-400">{formatCurrency(cp.amount)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t-2 border-border font-bold text-sm">
                                            <span className="text-foreground">Remaining Balance</span>
                                            <span className={vehicle.balanceAmount > 0 ? "text-red-400" : "text-emerald-400"}>
                                                {formatCurrency(vehicle.balanceAmount)}
                                                {vehicle.balanceAmount <= 0 && <span className="ml-2 text-[11px]">✓ Fully settled</span>}
                                            </span>
                                        </div>
                                        {vehicle.soldPrice > 0 && (
                                            <div>
                                                <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full" style={{ width: `${Math.min(100, (vehicle.receivedAmount / vehicle.soldPrice) * 100)}%` }} />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1">{((vehicle.receivedAmount / vehicle.soldPrice) * 100).toFixed(0)}% of total received (exchange + cash)</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Activity Log Tab */}
            {activeTab === "activity" && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {vehicle.activityLog.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No activity recorded</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {[...vehicle.activityLog].reverse().map((log, i) => {
                                // Determine icon bg + text color based on action type
                                const isExchangePayment = log.action === "sale_payment" && log.description.toLowerCase().includes("exchange");
                                const isDeletion = log.action === "sale_payment_deleted" || log.action === "purchase_payment_deleted";
                                const isRevert = log.action === "sale_undone" || log.action === "reverted";
                                const isSale = log.action === "sold";
                                const isPayment = log.action === "sale_payment" || log.action === "purchase_payment";

                                const iconBg =
                                    isExchangePayment ? "bg-orange-500/10 text-orange-400" :
                                    isDeletion        ? "bg-red-500/10 text-red-400" :
                                    isRevert          ? "bg-yellow-500/10 text-yellow-400" :
                                    isSale            ? "bg-emerald-500/10 text-emerald-400" :
                                    isPayment         ? "bg-primary/10 text-primary" :
                                                        "bg-muted/40 text-muted-foreground";

                                const amountColor =
                                    isDeletion ? "text-red-400 line-through" :
                                    isExchangePayment ? "text-orange-400" :
                                    "text-primary";

                                // Prefix deletions with a clear ✕ marker
                                const prefix = isDeletion ? "✕ " : "";

                                return (
                                <div key={i} className="flex items-start gap-4 px-5 py-3">
                                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs ${iconBg}`}>
                                        <Activity className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">{prefix}{log.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.date)}</p>
                                    </div>
                                    {log.amount && (
                                        <span className={`text-xs font-semibold shrink-0 ${amountColor}`}>
                                            {isDeletion ? "-" : "+"}{formatCurrency(log.amount)}
                                        </span>
                                    )}
                                </div>
                                );
                            })}

                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VehicleDetail;
