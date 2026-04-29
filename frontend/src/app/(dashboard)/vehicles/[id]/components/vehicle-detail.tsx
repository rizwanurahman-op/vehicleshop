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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
    ArrowLeft, Bike, Car, TrendingUp, TrendingDown, IndianRupee, ArrowLeftRight,
    DollarSign, Plus, Trash2, Loader2, FileText, Activity, Sparkles, ShoppingCart,
    Package, ExternalLink
} from "lucide-react";
import Link from "next/link";
import VehicleStatusBadge from "../../components/vehicle-status-badge";
import CostsTab from "./costs-tab";
import { PURCHASE_PAYMENT_MODES, SALE_PAYMENT_METHODS, NOC_STATUSES } from "@data/vehicle-constants";
import { recordSaleSchema, addPurchasePaymentSchema, addSalePaymentSchema } from "@schemas/vehicle";
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
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            amount: 0,
            mode: "Cash" as const,
            type: "cash" as const,
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

    // Unified payment method state (replaces mode + type)
    const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
    const isExchange = paymentMethod === "Exchange";

    const handleMethodChange = (method: string) => {
        setPaymentMethod(method);
        const found = SALE_PAYMENT_METHODS.find(m => m.value === method);
        if (found) {
            form.setValue("mode", found.backendMode as z.infer<typeof addSalePaymentSchema>["mode"]);
            form.setValue("type", found.backendType);
        }
        // Reset exchange fields when switching away from exchange
        if (method !== "Exchange") {
            form.setValue("exchangeVehicleMake", "");
            form.setValue("exchangeVehicleRegNo", "");
            form.setValue("exchangeDetails", "");
        }
    };

    const addToInventory = form.watch("addToInventory");

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: z.infer<typeof addSalePaymentSchema>) => {
            setTid(toast.loading("Recording payment..."));
            // Map addToInventory checkbox → createExchangeAs
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
                toast.success(`Payment recorded! Exchange vehicle created: ${ev.make} (${ev.registrationNo}) → Purchased Inventory`, { id: tid, duration: 6000 });
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
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setPaymentMethod("Cash"); } }}>
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
                            <DialogTitle className="text-base font-bold text-foreground">Sale Payment</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Record money received from buyer</DialogDescription>
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
                                    <FormItem><FormLabel className="text-xs font-semibold text-foreground">{isExchange ? "Exchange Value ₹ *" : "Amount ₹ *"}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <IndianRupee className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                                                <Input type="number" min="0" className="h-9 bg-muted/50 border-border pl-7 text-sm" value={field.value || ""} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
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

                                    {/* Auto-add to inventory toggle */}
                                    <div className={cn(
                                        "flex items-start gap-3 rounded-lg border p-3 transition-colors",
                                        addToInventory ? "border-emerald-500/30 bg-emerald-500/5" : "border-dashed border-border"
                                    )}>
                                        <input
                                            type="checkbox"
                                            id="addToInventory"
                                            checked={addToInventory ?? true}
                                            onChange={e => form.setValue("addToInventory", e.target.checked)}
                                            className="mt-0.5 h-4 w-4 rounded accent-emerald-500"
                                        />
                                        <div>
                                            <label htmlFor="addToInventory" className="text-xs font-semibold text-foreground cursor-pointer">
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
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Reference No</FormLabel>
                                    <FormControl><Input placeholder="UPI/Cheque ref..." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem><FormLabel className="text-xs font-semibold text-foreground">Notes</FormLabel>
                                    <FormControl><Input placeholder="advance, balance, etc." className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl></FormItem>
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

// ── Main Vehicle Detail Component ─────────────────────────────────
const VehicleDetail = ({ id, initialData }: { id: string; initialData: IVehicle | null }) => {
    const [activeTab, setActiveTab] = useState("overview");
    const queryClient = useQueryClient();

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
                                </div>
                                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{vehicle.make} {vehicle.model}</h1>
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                    <span className="font-mono bg-muted/50 px-1.5 py-0.5 rounded text-[10px] sm:text-xs mr-2">{vehicle.registrationNo}</span>
                                    Purchased {formatDate(vehicle.datePurchased)} from <strong className="text-foreground">{vehicle.purchasedFrom}</strong>
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

                {/* Sale Payment Progress */}
                {isSold && vehicle.soldPrice && (
                    <div className="border-t border-border px-5 py-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Received: <strong className="text-emerald-400">{formatCurrency(vehicle.receivedAmount)}</strong></span>
                            <span>Balance: <strong className={vehicle.balanceAmount > 0 ? "text-red-400" : "text-emerald-400"}>{formatCurrency(vehicle.balanceAmount)}</strong></span>
                        </div>
                        <div className="h-2 bg-muted/40 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-success rounded-full transition-all" style={{ width: `${Math.min(100, (vehicle.receivedAmount / vehicle.soldPrice!) * 100)}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0 border-b border-border overflow-x-auto">
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
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vehicle Details</p>
                        {[
                            { label: "Make & Model", value: `${vehicle.make} ${vehicle.model}` },
                            { label: "Year", value: vehicle.year?.toString() || "—" },
                            { label: "Registration No", value: vehicle.registrationNo },
                            { label: "Color", value: vehicle.color || "—" },
                            { label: "Engine No", value: vehicle.engineNo || "—" },
                            { label: "Chassis No", value: vehicle.chassisNo || "—" },
                            { label: "Funding Source", value: vehicle.fundingSource.replace("_", " ").toUpperCase() },
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
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Status: <Badge variant={vehicle.purchasePaymentStatus === "paid" ? "default" : "secondary"} className="ml-1 text-[10px]">
                                    {vehicle.purchasePaymentStatus.toUpperCase()}
                                </Badge>
                                {vehicle.purchasePendingAmount > 0 && <span className="ml-2 text-orange-400">Pending: {formatCurrency(vehicle.purchasePendingAmount)}</span>}
                            </p>
                        </div>
                        <AddPurchasePaymentDialog vehicle={vehicle} />
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
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deletePayment({ type: "purchase", paymentId: p._id })}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
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
                            <RecordSaleDialog vehicle={vehicle} />
                        </div>
                    ) : (
                        <>
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

                            {/* Payment Timeline */}
                            <div className="flex items-center justify-between">
                                <p className="font-bold text-foreground">Payment Timeline</p>
                                <AddSalePaymentDialog vehicle={vehicle} />
                            </div>
                            {vehicle.salePayments.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground text-sm">No payments recorded yet</div>
                            ) : (
                                <div className="rounded-xl border border-border bg-card overflow-hidden">
                                    {vehicle.salePayments.map((p, i) => (
                                        <div key={p._id} className={cn("flex items-center justify-between px-5 py-3", i > 0 ? "border-t border-border" : "")}>
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10 text-emerald-400 text-xs font-bold">{i + 1}</div>
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-sm font-semibold text-emerald-400">+{formatCurrency(p.amount)} <span className="text-xs font-normal text-muted-foreground">via {p.mode}</span></p>
                                                        {p.type === "exchange" && (
                                                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">
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
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatDate(p.date)}
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
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => deletePayment({ type: "sale", paymentId: p._id })}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
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
                            {[...vehicle.activityLog].reverse().map((log, i) => (
                                <div key={i} className="flex items-start gap-4 px-5 py-3">
                                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">
                                        <Activity className="h-3.5 w-3.5" />
                                    </div>
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

export default VehicleDetail;
