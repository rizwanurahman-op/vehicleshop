"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState } from "react";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { formatApiErrors } from "@lib/formatApiErrors";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { recordConsignmentSaleSchema, addBuyerPaymentSchema, addPayeePaymentSchema, addConsignmentCostBreakdownItemSchema } from "@schemas/consignment";
import { ExchangeVehiclePicker } from "@/components/exchange-vehicle-picker";
import { SALE_PAYMENT_METHODS } from "@data/vehicle-constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
    ArrowLeft, Bike, Car, Store, CreditCard, TrendingUp, TrendingDown,
    IndianRupee, Plus, Trash2, Loader2, Activity, FileText,
    DollarSign, Sparkles, RotateCcw, CheckCircle2, Package,
    User, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink
} from "lucide-react";
import Link from "next/link";

const fetchConsignment = async (id: string): Promise<IConsignmentVehicle | null> => {
    const res = await axios.get<ApiResponse<IConsignmentVehicle>>(`/consignments/${id}`);
    return res.data.data ?? null;
};

// ── helpers ───────────────────────────────────────────────────────
const payeeLabel = (v: IConsignmentVehicle) => v.saleType === "park_sale" ? "Owner" : "Finance";

const SaleTypePill = ({ type }: { type: SaleType }) => (
    <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md", type === "park_sale" ? "bg-violet-500/10 text-violet-400" : "bg-blue-500/10 text-blue-400")}>
        {type === "park_sale" ? <><Store className="h-3 w-3" />Park Sale</> : <><CreditCard className="h-3 w-3" />Finance Sale</>}
    </span>
);

const COST_CATEGORIES = ["workshop", "spareParts", "painting", "washing", "fuel", "paperwork", "commission", "other"] as const;

// ── Record Sale Dialog ─────────────────────────────────────────────
const RecordSaleDialog = ({ vehicle }: { vehicle: IConsignmentVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const qc = useQueryClient();
    const form = useForm({ resolver: zodResolver(recordConsignmentSaleSchema), defaultValues: { dateSold: new Date().toISOString().split("T")[0], soldPrice: 0, soldTo: "", soldToPhone: "", remarks: "" } });

    const { mutate, isPending } = useMutation({
        mutationFn: async (v: z.infer<typeof recordConsignmentSaleSchema>) => { setTid(toast.loading("Recording sale...")); return axios.post(`/consignments/${vehicle._id}/sale`, v); },
        onSuccess: () => { toast.success("Sale recorded!", { id: tid }); qc.invalidateQueries({ queryKey: ["consignment", vehicle._id] }); setOpen(false); },
        onError: (err: unknown) => { const e = (err as AxiosError)?.response?.data as ErrorData; toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message }); },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-success text-white hover:opacity-90 cursor-pointer shadow-md"><DollarSign className="mr-2 h-4 w-4" />Record Sale</Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-md p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-success/10 blur-3xl" />
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-success shadow-lg"><DollarSign className="h-5 w-5 text-white" /></div>
                        <div>
                            <div className="flex items-center gap-1.5 mb-0.5"><Sparkles className="h-3 w-3 text-success" /><span className="text-[10px] font-bold tracking-widest text-success uppercase">Sale</span></div>
                            <DialogTitle className="text-lg font-bold text-foreground">Record Sale</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">{vehicle.make} {vehicle.model} — {vehicle.registrationNo}</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(v => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={form.control} name="dateSold" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Date Sold *</FormLabel><FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="soldPrice" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Sold Price (₹) *</FormLabel>
                                        <FormControl><div className="relative"><IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" /><Input type="number" min="0" className="h-9 bg-muted/50 border-border pl-7 text-sm" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></div></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="soldTo" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Buyer Name *</FormLabel><FormControl><Input placeholder="Buyer's name" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="soldToPhone" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Buyer Phone</FormLabel><FormControl><Input placeholder="+91 9876543210" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="remarks" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Remarks</FormLabel><FormControl><Textarea placeholder="Any notes..." rows={2} className="resize-none bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
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

// ── Add Buyer Payment Dialog — Unified Payment Method ─────────────
const AddBuyerPaymentDialog = ({ vehicle }: { vehicle: IConsignmentVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const qc = useQueryClient();
    const form = useForm({ resolver: zodResolver(addBuyerPaymentSchema), defaultValues: { date: new Date().toISOString().split("T")[0], amount: 0, mode: "Cash" as const, type: "cash" as const, exchangeVehicleMake: "", exchangeVehicleRegNo: "", exchangeVehicleType: "two_wheeler" as const, referenceNo: "", notes: "", createExchangeAs: "phase2_purchase" as const, addToInventory: true } });

    // Unified payment method state
    const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
    const isExchange = paymentMethod === "Exchange";

    const handleMethodChange = (method: string) => {
        setPaymentMethod(method);
        const found = SALE_PAYMENT_METHODS.find(m => m.value === method);
        if (found) {
            form.setValue("mode", found.backendMode as z.infer<typeof addBuyerPaymentSchema>["mode"]);
            form.setValue("type", found.backendType);
        }
        if (method !== "Exchange") {
            form.setValue("exchangeVehicleMake", "");
            form.setValue("exchangeVehicleRegNo", "");
        }
    };

    const addToInventory = form.watch("addToInventory");

    const { mutate, isPending } = useMutation({
        mutationFn: async (v: z.infer<typeof addBuyerPaymentSchema>) => {
            setTid(toast.loading("Recording payment..."));
            const payload = { ...v };
            if (v.type === "exchange") {
                payload.createExchangeAs = v.addToInventory ? "phase2_purchase" : "skip";
            } else {
                payload.createExchangeAs = "skip";
            }
            return axios.post(`/consignments/${vehicle._id}/buyer-payments`, payload);
        },
        onSuccess: () => { toast.success("Payment recorded!", { id: tid }); qc.invalidateQueries({ queryKey: ["consignment", vehicle._id] }); form.reset(); setPaymentMethod("Cash"); setOpen(false); },
        onError: (err: unknown) => { const e = (err as AxiosError)?.response?.data as ErrorData; toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message }); },
    });

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPaymentMethod("Cash"); }}>
            <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-success text-white hover:opacity-90 cursor-pointer"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Buyer Payment</Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-md p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-success shadow-lg"><ArrowDownLeft className="h-4 w-4 text-white" /></div>
                        <div><DialogTitle className="text-base font-bold text-foreground">Buyer Payment</DialogTitle><DialogDescription className="text-xs text-muted-foreground">Money received from buyer</DialogDescription></div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(v => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Date *</FormLabel><FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">{isExchange ? "Exchange Value ₹ *" : "Amount (₹) *"}</FormLabel><FormControl><Input type="number" min="0" className="h-9 bg-muted/50 border-border text-sm" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
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
                                        vehicleType={(form.watch("exchangeVehicleType") as "two_wheeler" | "four_wheeler") ?? "two_wheeler"}
                                        onChange={(v) => {
                                            form.setValue("exchangeVehicleRegNo", v.registrationNo);
                                            form.setValue("exchangeVehicleMake", `${v.make}${v.model ? " " + v.model : ""}`.trim());
                                            form.setValue("exchangeVehicleType", v.vehicleType);
                                        }}
                                    />

                                    {/* Auto-add to inventory toggle */}
                                    <div className={cn(
                                        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                                        addToInventory ? "border-emerald-500/30 bg-emerald-500/5" : "border-dashed border-border"
                                    )}>
                                        <input
                                            type="checkbox"
                                            id="buyerAddToInventory"
                                            checked={addToInventory ?? true}
                                            onChange={e => form.setValue("addToInventory", e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-emerald-500"
                                        />
                                        <div>
                                            <label htmlFor="buyerAddToInventory" className="text-xs font-semibold text-foreground cursor-pointer">
                                                Auto-add to Purchased Inventory
                                            </label>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                Creates a new vehicle in your purchased inventory with the exchange value as purchase price
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Reference No</FormLabel><FormControl><Input placeholder="UPI/Cheque ref..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel><FormControl><Input placeholder="advance, balance, etc." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
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

// ── Add Payee Payment Dialog ──────────────────────────────────────
const AddPayeePaymentDialog = ({ vehicle }: { vehicle: IConsignmentVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const qc = useQueryClient();
    const form = useForm({ resolver: zodResolver(addPayeePaymentSchema), defaultValues: { date: new Date().toISOString().split("T")[0], amount: 0, mode: "Cash" as const, notes: "", markClosed: false } });
    const label = payeeLabel(vehicle);

    const { mutate, isPending } = useMutation({
        mutationFn: async (v: z.infer<typeof addPayeePaymentSchema>) => { setTid(toast.loading(`Recording ${label} payment...`)); return axios.post(`/consignments/${vehicle._id}/payee-payments`, v); },
        onSuccess: () => { toast.success(`${label} payment recorded!`, { id: tid }); qc.invalidateQueries({ queryKey: ["consignment", vehicle._id] }); form.reset(); setOpen(false); },
        onError: (err: unknown) => { const e = (err as AxiosError)?.response?.data as ErrorData; toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message }); },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-border"><Plus className="mr-1.5 h-3.5 w-3.5" />Pay {label}</Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-sm p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg"><ArrowUpRight className="h-4 w-4 text-white" /></div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">Pay {label}</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Payment to {label === "Owner" ? vehicle.previousOwner : (vehicle.financeCompany || "Finance")}</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(v => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            {/* Sale summary */}
                            {vehicle.soldPrice && (
                                <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-1 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Sold Price</span><span>{formatCurrency(vehicle.soldPrice)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Recon Cost</span><span>-{formatCurrency(vehicle.totalReconCost)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Paid so far</span><span className="text-emerald-400">-{formatCurrency(vehicle.paidToPayee)}</span></div>
                                    <div className="flex justify-between font-bold border-t border-border pt-1"><span>Remaining</span><span className="text-orange-400">{formatCurrency(vehicle.payeeBalance)}</span></div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Date *</FormLabel><FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Amount (₹) *</FormLabel><FormControl><Input type="number" min="0" className="h-9 bg-muted/50 border-border text-sm" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="mode" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Mode *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{["Cash", "Online", "Cheque", "UPI", "Bank Transfer"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel><FormControl><Input placeholder="balance payment, final..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="markClosed" render={({ field }) => (
                                <FormItem className="flex items-start gap-3 rounded-lg border border-dashed border-border p-3">
                                    <input type="checkbox" id="markClosed" checked={field.value} onChange={e => field.onChange(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-primary" />
                                    <div>
                                        <FormLabel htmlFor="markClosed" className="text-xs font-semibold text-foreground cursor-pointer">Mark as Closed (final payment, fully settled)</FormLabel>
                                    </div>
                                </FormItem>
                            )} />
                        </div>
                        <div className="border-t border-border bg-muted/20 p-4 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : `Record Payment`}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Add Cost Breakdown Dialog ─────────────────────────────────────
const AddCostBreakdownDialog = ({ vehicle }: { vehicle: IConsignmentVehicle }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const qc = useQueryClient();
    const form = useForm({ resolver: zodResolver(addConsignmentCostBreakdownItemSchema), defaultValues: { category: "workshop" as const, name: "", amount: 0, date: "", notes: "" } });

    const { mutate, isPending } = useMutation({
        mutationFn: async (v: z.infer<typeof addConsignmentCostBreakdownItemSchema>) => { setTid(toast.loading("Adding...")); return axios.post(`/consignments/${vehicle._id}/costs/breakdown`, v); },
        onSuccess: () => { toast.success("Cost item added!", { id: tid }); qc.invalidateQueries({ queryKey: ["consignment", vehicle._id] }); form.reset(); setOpen(false); },
        onError: (err: unknown) => { const e = (err as AxiosError)?.response?.data as ErrorData; toast.error("Error!", { id: tid, description: formatApiErrors(e?.errors) || e?.message }); },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-border"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Cost Item</Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-sm p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg"><IndianRupee className="h-4 w-4 text-white" /></div>
                        <div><DialogTitle className="text-base font-bold text-foreground">Add Cost Item</DialogTitle><DialogDescription className="text-xs text-muted-foreground">Itemized reconditioning cost</DialogDescription></div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(v => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <FormField control={form.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Category *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="h-9 bg-muted/50 border-border text-sm"><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>{COST_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}</SelectContent>
                                    </Select><FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Item Name *</FormLabel><FormControl><Input placeholder="Tyre, Abhilash..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">Amount (₹) *</FormLabel><FormControl><Input type="number" min="0" className="h-9 bg-muted/50 border-border text-sm" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="date" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Date</FormLabel><FormControl><Input type="date" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel><FormControl><Input placeholder="any detail..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                        </div>
                        <div className="border-t border-border bg-muted/20 p-4 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</> : "Add Item"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Main Detail Component ─────────────────────────────────────────
const ConsignmentDetail = ({ id, initialData }: { id: string; initialData: IConsignmentVehicle | null }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const qc = useQueryClient();

    const { data: vehicle } = useQuery<IConsignmentVehicle | null>({
        queryKey: ["consignment", id],
        queryFn: () => fetchConsignment(id),
        initialData,
        retry: 0,
    });

    const { mutate: deleteBuyerPayment } = useMutation({
        mutationFn: async (paymentId: string) => axios.delete(`/consignments/${id}/buyer-payments/${paymentId}`),
        onSuccess: () => { toast.success("Payment deleted"); qc.invalidateQueries({ queryKey: ["consignment", id] }); },
    });

    const { mutate: deletePayeePayment } = useMutation({
        mutationFn: async (paymentId: string) => axios.delete(`/consignments/${id}/payee-payments/${paymentId}`),
        onSuccess: () => { toast.success("Payment deleted"); qc.invalidateQueries({ queryKey: ["consignment", id] }); },
    });

    const { mutate: deleteCostItem } = useMutation({
        mutationFn: async (itemId: string) => axios.delete(`/consignments/${id}/costs/breakdown/${itemId}`),
        onSuccess: () => { toast.success("Cost item deleted"); qc.invalidateQueries({ queryKey: ["consignment", id] }); },
    });

    const { mutate: undoSale, isPending: undoingSale } = useMutation({
        mutationFn: async () => axios.delete(`/consignments/${id}/sale`),
        onSuccess: () => { toast.success("Sale reverted"); qc.invalidateQueries({ queryKey: ["consignment", id] }); },
    });

    const { mutate: closeSale } = useMutation({
        mutationFn: async () => axios.post(`/consignments/${id}/payee-payments/close`),
        onSuccess: () => { toast.success("Settlement closed"); qc.invalidateQueries({ queryKey: ["consignment", id] }); },
    });

    if (!vehicle) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Package className="h-16 w-16 text-muted-foreground/30" />
            <p className="text-muted-foreground">Consignment not found</p>
            <Link href="/consignments"><Button variant="outline">← Back to Consignments</Button></Link>
        </div>
    );

    const isSold = !!(vehicle.dateSold && vehicle.soldPrice);
    const isProfit = vehicle.netProfit >= 0;
    const VehicleIcon = vehicle.vehicleType === "two_wheeler" ? Bike : Car;
    const label = payeeLabel(vehicle);

    const hasExchangeActivity = vehicle.isFromExchange ||
        vehicle.isExchange ||
        vehicle.buyerPayments.some(p => p.type === "exchange");

    const tabs = [
        { id: "overview", label: "Overview", icon: Package },
        { id: "costs", label: "Costs", icon: FileText },
        { id: "buyer", label: "Buyer Payments", icon: ArrowDownLeft },
        { id: "payee", label: `${label} Payments`, icon: ArrowUpRight },
        ...(hasExchangeActivity ? [{ id: "exchange", label: "Exchange", icon: ArrowLeftRight }] : []),
        { id: "activity", label: "Activity Log", icon: Activity },
    ];

    return (
        <div className="flex w-full flex-col gap-5 pb-10">
            {/* Back */}
            <Link href="/consignments" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                <ArrowLeft className="h-4 w-4" /> Back to Consignments
            </Link>

            {/* Hero Card */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="glass-header relative p-5 sm:p-6">
                    <div className={cn("absolute -top-16 -right-16 h-32 w-32 rounded-full blur-3xl", vehicle.saleType === "park_sale" ? "bg-violet-500/10" : "bg-blue-500/10")} />
                    <div className="relative flex flex-col sm:flex-row items-start sm:justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                            <div className={cn("flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl shadow-lg shrink-0 mt-1 sm:mt-0", vehicle.saleType === "park_sale" ? "bg-violet-500/20" : "bg-blue-500/20")}>
                                <VehicleIcon className={cn("h-6 w-6 sm:h-7 sm:w-7", vehicle.saleType === "park_sale" ? "text-violet-400" : "text-blue-400")} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                    <span className="text-[10px] sm:text-xs font-mono font-bold text-primary bg-primary/10 px-1.5 sm:px-2 py-0.5 rounded-md">{vehicle.consignmentId}</span>
                                    <SaleTypePill type={vehicle.saleType} />
                                    {vehicle.settlementStatus === "fully_closed" && (
                                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] sm:text-[10px]"><CheckCircle2 className="mr-1 h-2.5 w-2.5" />Fully Closed</Badge>
                                    )}
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{vehicle.make} {vehicle.model}</h1>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px] sm:text-xs mr-2">{vehicle.registrationNo}</span>
                                    <User className="inline h-3 w-3 mr-1" />{vehicle.previousOwner}
                                    {vehicle.financeCompany && <span className="ml-2 text-blue-400">· {vehicle.financeCompany}</span>}
                                    {vehicle.daysInShop != null && <span className="ml-2">· {vehicle.daysInShop}d in shop</span>}
                                </p>
                            </div>
                        </div>
                        {!isSold && (
                            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                                <RecordSaleDialog vehicle={vehicle} />
                            </div>
                        )}
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
                            <p className="text-[11px] text-muted-foreground">This consignment was sold with an exchange vehicle as part of the payment.</p>
                        </div>
                        <button onClick={() => setActiveTab("exchange")} className="shrink-0 text-[11px] font-semibold text-orange-400 hover:underline">
                            View Exchange →
                        </button>
                    </div>
                )}
                {vehicle.isFromExchange && vehicle.exchangeSourceRef && (
                    <div className="mx-0 border-t-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-amber-500/5 px-5 py-4 flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 mt-0.5">
                            <ArrowLeftRight className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">📥 Received via Exchange</p>
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                                {vehicle.make} {vehicle.model}
                                <span className="font-mono text-xs text-muted-foreground ml-2">({vehicle.registrationNo})</span>
                            </p>
                            {vehicle.exchangeDetails ? (
                                <p className="text-[11px] text-amber-300/80 mt-0.5">{vehicle.exchangeDetails}</p>
                            ) : (
                                <p className="text-[11px] text-muted-foreground mt-0.5">This vehicle entered inventory as a trade-in from a sale deal.</p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                            <button onClick={() => setActiveTab("exchange")} className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1">
                                View Details →
                            </button>
                            <Link href={`/${vehicle.exchangeSourceCollection === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeSourceRef}`}
                                className="text-[11px] font-semibold text-amber-400/70 hover:text-amber-400 hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> Source Deal
                            </Link>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border-y border-border">
                    {[
                        { label: "Total Investment", value: formatCurrency(vehicle.totalInvestment), sub: `Recon: ${formatCurrency(vehicle.totalReconCost)}` },
                        { label: isSold ? "Sold Price" : "Status", value: isSold ? formatCurrency(vehicle.soldPrice!) : vehicle.status.replace(/_/g, " "), sub: isSold ? `To: ${vehicle.soldTo}` : formatDate(vehicle.dateReceived) },
                        { label: `Paid to ${label}`, value: formatCurrency(vehicle.paidToPayee), sub: `Balance: ${formatCurrency(vehicle.payeeBalance)}`, color: vehicle.payeeBalance > 0 ? "text-orange-400" : "text-foreground" },
                        { label: isSold ? "Net Profit" : "P&L (Unrealized)", value: formatCurrency(Math.abs(vehicle.netProfit)), sub: `${isProfit ? "+" : ""}${vehicle.profitLossPercentage.toFixed(1)}%`, color: isSold ? (isProfit ? "text-emerald-400" : "text-red-400") : "text-muted-foreground" },
                    ].map(s => (
                        <div key={s.label} className="p-4 flex flex-col gap-1 bg-card">
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">{s.label}</p>
                            <p className={cn("text-base sm:text-lg font-bold", s.color ?? "text-foreground")}>
                                {s.label.includes("Profit") && isSold && (isProfit ? <TrendingUp className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> : <TrendingDown className="inline h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />)}
                                {s.value}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground">{s.sub}</p>
                        </div>
                    ))}
                </div>

                {/* Progress bars */}
                {isSold && vehicle.soldPrice && (
                    <div className="border-t border-border px-5 py-3 space-y-2">
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Buyer: <strong className="text-emerald-400">{formatCurrency(vehicle.receivedAmount)}</strong></span>
                                <span>Balance: <strong className={vehicle.buyerBalance > 0 ? "text-orange-400" : "text-emerald-400"}>{formatCurrency(vehicle.buyerBalance)}</strong></span>
                            </div>
                            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-success rounded-full" style={{ width: `${Math.min(100, (vehicle.receivedAmount / vehicle.soldPrice) * 100)}%` }} />
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{label}: <strong className="text-primary">{formatCurrency(vehicle.paidToPayee)}</strong></span>
                                <Badge className={cn("text-[10px]", vehicle.payeePaymentStatus === "closed" ? "bg-emerald-500/10 text-emerald-400" : vehicle.payeePaymentStatus === "not_started" ? "bg-muted text-muted-foreground" : "bg-orange-500/10 text-orange-400")}>
                                    {vehicle.payeePaymentStatus.replace(/_/g, " ").toUpperCase()}
                                </Badge>
                            </div>
                            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-brand rounded-full" style={{ width: `${vehicle.soldPrice > 0 ? Math.min(100, (vehicle.paidToPayee / (vehicle.soldPrice - vehicle.totalReconCost)) * 100) : 0}%` }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-border overflow-x-auto">
                {tabs.map(tab => {
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

            {/* ── Overview Tab ── */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vehicle Details</p>
                        {[
                            { label: "Make & Model", value: `${vehicle.make} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ""}` },
                            { label: "Registration No", value: vehicle.registrationNo },
                            { label: "Color", value: vehicle.color || "—" },
                            { label: "Engine No", value: vehicle.engineNo || "—" },
                            { label: "Chassis No", value: vehicle.chassisNo || "—" },
                            { label: "Date Received", value: formatDate(vehicle.dateReceived) },
                            { label: vehicle.saleType === "park_sale" ? "Owner" : "Previous Owner", value: vehicle.previousOwner },
                            { label: "Phone", value: vehicle.previousOwnerPhone || "—" },
                            vehicle.financeCompany ? { label: "Finance Company", value: vehicle.financeCompany } : null,
                        ].filter(Boolean).map(r => (
                            <div key={r!.label} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                <span className="text-muted-foreground">{r!.label}</span>
                                <span className="font-medium text-foreground text-right">{r!.value}</span>
                            </div>
                        ))}
                        {/* Exchange Origin Row */}
                        {vehicle.isFromExchange && vehicle.exchangeSourceRef && (
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                    <ArrowLeftRight className="h-3 w-3 text-amber-400" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Exchange Origin</p>
                                </div>
                                {vehicle.exchangeDetails ? (
                                    <p className="text-xs text-muted-foreground">{vehicle.exchangeDetails}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Received as trade-in from a sale deal.</p>
                                )}
                                <div className="flex gap-3 pt-0.5">
                                    <button onClick={() => setActiveTab("exchange")} className="text-[11px] font-semibold text-amber-400 hover:underline">
                                        View Exchange Details →
                                    </button>
                                    <Link href={`/${vehicle.exchangeSourceCollection === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeSourceRef}`}
                                        className="text-[11px] text-amber-400/70 hover:text-amber-400 hover:underline flex items-center gap-0.5">
                                        <ExternalLink className="h-2.5 w-2.5" /> Source Deal
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                    {isSold && (
                        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sale Details</p>
                            {[
                                { label: "Date Sold", value: vehicle.dateSold ? formatDate(vehicle.dateSold) : "—" },
                                { label: "Sold To", value: vehicle.soldTo || "—" },
                                { label: "Buyer Phone", value: vehicle.soldToPhone || "—" },
                                { label: "Sold Price", value: formatCurrency(vehicle.soldPrice!) },
                                { label: "Payment Method", value: vehicle.isExchange ? "Exchange + Cash" : "Cash" },
                                { label: "Days in Shop", value: vehicle.daysInShop != null ? `${vehicle.daysInShop} days` : "—" },
                                { label: "Settlement", value: vehicle.settlementStatus.replace(/_/g, " ") },
                            ].map(r => (
                                <div key={r.label} className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-muted-foreground">{r.label}</span>
                                    <span className={`font-medium text-right ${r.label === "Payment Method" && vehicle.isExchange ? "text-orange-400" : "text-foreground"}`}>{r.value}</span>
                                </div>
                            ))}
                            {vehicle.settlementStatus !== "fully_closed" && isSold && (
                                <Button size="sm" variant="outline" className="w-full border-destructive text-destructive hover:bg-destructive/10" onClick={() => undoSale()} disabled={undoingSale}>
                                    <RotateCcw className="mr-2 h-3.5 w-3.5" />{undoingSale ? "Reverting..." : "Undo Sale"}
                                </Button>
                            )}
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

            {/* ── Costs Tab ── */}
            {activeTab === "costs" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-foreground">Reconditioning Costs</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Total: <strong>{formatCurrency(vehicle.totalReconCost)}</strong></p>
                        </div>
                        <AddCostBreakdownDialog vehicle={vehicle} />
                    </div>
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        {[
                            { field: "workshopRepairCost", label: "Workshop / Repair", category: "workshop" },
                            { field: "sparePartsAccessories", label: "Spare Parts", category: "spareParts" },
                            { field: "paintingPolishingCost", label: "Painting / Polishing", category: "painting" },
                            { field: "washingDetailingCost", label: "Washing / Detailing", category: "washing" },
                            { field: "fuelCost", label: "Fuel", category: "fuel" },
                            { field: "paperworkTaxInsurance", label: "Paperwork / Tax", category: "paperwork" },
                            { field: "commission", label: "Commission", category: "commission" },
                            { field: "otherExpenses", label: "Other Expenses", category: "other" },
                        ].map((row, i) => {
                            const amount = vehicle[row.field as keyof IConsignmentVehicle] as number;
                            const breakdown = vehicle.costBreakdowns?.find(b => b.category === row.category);
                            return (
                                <div key={row.field} className={cn("px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">{row.label}</span>
                                        <span className={cn("text-sm font-semibold", amount > 0 ? "text-foreground" : "text-muted-foreground/40")}>{formatCurrency(amount)}</span>
                                    </div>
                                    {breakdown && breakdown.items.length > 0 && (
                                        <div className="mt-2 space-y-1 pl-3 border-l-2 border-border">
                                            {breakdown.items.map(item => (
                                                <div key={item._id} className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>{item.name} {item.date ? `(${formatDate(item.date)})` : ""}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span>{formatCurrency(item.amount)}</span>
                                                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteCostItem(item._id)}>
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div className="border-t-2 border-border px-5 py-3 flex justify-between font-bold">
                            <span className="text-sm text-foreground">Total Reconditioning</span>
                            <span className="text-sm text-foreground">{formatCurrency(vehicle.totalReconCost)}</span>
                        </div>
                        <div className="border-t border-border px-5 py-3 flex justify-between font-bold bg-muted/20">
                            <span className="text-sm text-foreground">Total Investment (incl. purchase)</span>
                            <span className="text-sm text-primary">{formatCurrency(vehicle.totalInvestment)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Buyer Payments Tab ── */}
            {activeTab === "buyer" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-foreground">Buyer Payments</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Status: <Badge variant={vehicle.buyerPaymentStatus === "paid" ? "default" : "secondary"} className="ml-1 text-[10px]">{vehicle.buyerPaymentStatus.toUpperCase()}</Badge>
                                {vehicle.buyerBalance > 0 && <span className="ml-2 text-orange-400">Balance: {formatCurrency(vehicle.buyerBalance)}</span>}
                            </p>
                        </div>
                        {isSold && <AddBuyerPaymentDialog vehicle={vehicle} />}
                    </div>
                    {!isSold ? (
                        <div className="rounded-xl border border-dashed border-border p-10 text-center">
                            <DollarSign className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground mb-4">Record the sale first to start tracking buyer payments</p>
                            <RecordSaleDialog vehicle={vehicle} />
                        </div>
                    ) : vehicle.buyerPayments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">No buyer payments recorded yet</div>
                    ) : (
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            {vehicle.buyerPayments.map((p, i) => (
                                <div key={p._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-emerald-400 text-xs font-bold">{i + 1}</div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(p.amount)} <span className="text-xs font-normal text-muted-foreground">via {p.mode}</span></p>
                                                {p.type === "exchange" && (
                                                    <Badge className="bg-orange-500/10 text-orange-400 text-[10px]">
                                                        <ArrowLeftRight className="mr-1 h-2.5 w-2.5" />Exchange
                                                    </Badge>
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
                                            <p className="text-xs text-muted-foreground">{formatDate(p.date)}{p.referenceNo && ` — Ref: ${p.referenceNo}`}{p.notes && ` — ${p.notes}`}</p>
                                            {p.exchangeVehicleMake && (
                                                <p className="text-[11px] text-orange-400/80 mt-0.5">
                                                    {p.exchangeVehicleMake}{p.exchangeVehicleRegNo ? ` (${p.exchangeVehicleRegNo})` : ""}
                                                    {p.exchangeDetails ? ` — ${p.exchangeDetails}` : ""}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deleteBuyerPayment(p._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Payee Payments Tab ── */}
            {activeTab === "payee" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-foreground">{label} Payments</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Status: <Badge className={cn("ml-1 text-[10px]", vehicle.payeePaymentStatus === "closed" ? "bg-emerald-500/10 text-emerald-400" : "bg-orange-500/10 text-orange-400")}>
                                    {vehicle.payeePaymentStatus.replace(/_/g, " ").toUpperCase()}
                                </Badge>
                                {vehicle.payeeBalance > 0 && <span className="ml-2 text-orange-400">Owed: {formatCurrency(vehicle.payeeBalance)}</span>}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {isSold && vehicle.payeePaymentStatus !== "closed" && (
                                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10" onClick={() => closeSale()}>
                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark Closed
                                </Button>
                            )}
                            {isSold && <AddPayeePaymentDialog vehicle={vehicle} />}
                        </div>
                    </div>
                    {!isSold ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">Record the sale first</div>
                    ) : vehicle.payeePayments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">No payments to {label.toLowerCase()} yet</div>
                    ) : (
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            {vehicle.payeePayments.map((p, i) => (
                                <div key={p._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</div>
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">-{formatCurrency(p.amount)} <span className="text-xs font-normal text-muted-foreground">via {p.mode}</span></p>
                                            <p className="text-xs text-muted-foreground">{formatDate(p.date)}{p.notes && ` — ${p.notes}`}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deletePayeePayment(p._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── Exchange Tab ── */}
            {activeTab === "exchange" && (
                <div className="space-y-4">
                    {/* Exchange Origin — this consignment came in via exchange */}
                    {vehicle.isFromExchange && vehicle.exchangeSourceRef && (
                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 overflow-hidden">
                            <div className="px-5 py-3 bg-amber-500/15 border-b border-amber-500/20 flex items-center gap-2">
                                <ArrowLeftRight className="h-4 w-4 text-amber-400" />
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-400">📥 Exchange Origin</p>
                            </div>
                            <div className="p-5 space-y-4">
                                {/* This vehicle's exchange details */}
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Vehicle Received</p>
                                            <p className="font-semibold text-foreground">{vehicle.make} {vehicle.model}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Registration No</p>
                                            <p className="font-mono font-semibold text-foreground">{vehicle.registrationNo}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Received From (Buyer)</p>
                                            <p className="font-semibold text-foreground">{vehicle.previousOwner}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Date Received</p>
                                            <p className="font-semibold text-foreground">{formatDate(vehicle.dateReceived)}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[11px] text-muted-foreground mb-0.5">Exchange Value</p>
                                            <p className="font-bold text-amber-400 text-lg">{formatCurrency(vehicle.purchasePrice)}</p>
                                        </div>
                                    </div>
                                    {vehicle.exchangeDetails && (
                                        <div className="pt-3 border-t border-amber-500/20">
                                            <p className="text-[11px] text-muted-foreground mb-1">Origin Deal</p>
                                            <p className="text-xs text-amber-300/90">{vehicle.exchangeDetails}</p>
                                        </div>
                                    )}
                                </div>
                                {/* Link to source deal */}
                                <div className="flex items-center gap-3 pt-1">
                                    <Link
                                        href={`/${vehicle.exchangeSourceCollection === "vehicles" ? "vehicles" : "consignments"}/${vehicle.exchangeSourceRef}`}
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:underline rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        View Source Deal ({vehicle.exchangeSourceCollection === "vehicles" ? "Vehicle" : "Consignment"} Inventory)
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Exchange payments settlement view */}
                    {vehicle.buyerPayments.some(p => p.type === "exchange") && (
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

                                        {vehicle.buyerPayments.filter(p => p.type === "exchange").map(ep => (
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
                                                    <div className="mt-3 pt-3 border-t border-orange-500/10">
                                                        <span className="text-[10px] text-muted-foreground italic">Not added to inventory — recorded for reference only</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Cash Payments</p>
                                            {vehicle.buyerPayments.filter(p => p.type !== "exchange").length === 0 ? (
                                                <p className="text-xs text-muted-foreground">No cash payments recorded</p>
                                            ) : (
                                                vehicle.buyerPayments.filter(p => p.type !== "exchange").map((cp, i) => (
                                                    <div key={cp._id} className="flex justify-between text-sm">
                                                        <span className="text-muted-foreground">Payment {i + 1} ({cp.mode}) · {formatDate(cp.date)}</span>
                                                        <span className="font-semibold text-emerald-400">{formatCurrency(cp.amount)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t-2 border-border font-bold text-sm">
                                            <span className="text-foreground">Remaining Balance</span>
                                            <span className={vehicle.buyerBalance > 0 ? "text-red-400" : "text-emerald-400"}>
                                                {formatCurrency(vehicle.buyerBalance)}
                                                {vehicle.buyerBalance <= 0 && <span className="ml-2 text-[11px]">✓ Fully settled</span>}
                                            </span>
                                        </div>
                                        {vehicle.soldPrice > 0 && (
                                            <div>
                                                <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full"
                                                        style={{ width: `${Math.min(100, (vehicle.receivedAmount / vehicle.soldPrice) * 100)}%` }} />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                    {((vehicle.receivedAmount / vehicle.soldPrice) * 100).toFixed(0)}% of total received (exchange + cash)
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Activity Log Tab ── */}
            {activeTab === "activity" && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    {vehicle.activityLog.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">No activity recorded</div>
                    ) : (
                        <div className="divide-y divide-border">
                            {[...vehicle.activityLog].reverse().map((log, i) => (
                                <div key={i} className="flex items-start gap-4 px-5 py-3">
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Activity className="h-3.5 w-3.5" /></div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-foreground">{log.description}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(log.date)}</p>
                                    </div>
                                    {log.amount && <span className="text-xs font-semibold text-primary shrink-0">{formatCurrency(log.amount)}</span>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ConsignmentDetail;
