"use client";

import { z } from "zod";
import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { createRepaymentSchema } from "@schemas/repayment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, X, Plus, Calendar, Loader2, IndianRupee, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES } from "@data";
import { cn } from "@/lib/utils";

type FormData = Omit<z.infer<typeof createRepaymentSchema>, "lender">;

interface AddRepaymentDialogProps {
    lenderId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddRepaymentDialog({ lenderId, open, onOpenChange }: AddRepaymentDialogProps) {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const qc = useQueryClient();

    const form = useForm<FormData>({
        resolver: zodResolver(createRepaymentSchema.omit({ lender: true })),
        defaultValues: {
            date: new Date().toISOString().split("T")[0],
            amountPaid: 0,
            mode: "Cash",
            repaymentType: "Principal",
            referenceNo: "",
            remarks: "",
        },
    });

    const repaymentType = form.watch("repaymentType");

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setToastId(toast.loading("Recording…", { description: "Saving repayment record." }));
            return await axios.post("/repayments", { ...values, lender: lenderId });
        },
        onSuccess: () => {
            toast.success("Recorded!", { id: toastId, description: "Repayment has been recorded." });
            qc.invalidateQueries({ queryKey: ["lender-repayments", lenderId] });
            qc.invalidateQueries({ queryKey: ["lender", lenderId] });
            qc.invalidateQueries({ queryKey: ["lender-stats"] });
            qc.invalidateQueries({ queryKey: ["lenders"] });       // ← refresh lenders list page
            qc.invalidateQueries({ queryKey: ["repayments"] });
            qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
            form.reset({
                date: new Date().toISOString().split("T")[0],
                amountPaid: 0,
                mode: "Cash",
                repaymentType: "Principal",
                referenceNo: "",
                remarks: "",
            });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message || "Failed!" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                onOpenAutoFocus={e => e.preventDefault()}
                className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full"
            >
                {/* Header */}
                <div className="glass-header relative p-4 sm:p-6">
                    <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-success/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-success shadow-lg glass-header-icon">
                            <ArrowUpRight className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-success" />
                                <span className="text-[10px] font-bold tracking-widest text-success uppercase">New</span>
                            </div>
                            <DialogTitle className="m-0 text-lg font-bold text-foreground sm:text-xl">
                                Record Repayment
                            </DialogTitle>
                            <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                                Amount returned to this lender
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form
                        id="add-repayment-form"
                        onSubmit={form.handleSubmit(values => mutate(values))}
                        className="flex flex-col flex-1 overflow-hidden min-h-0"
                    >
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

                                {/* Repayment Type Selector */}
                                <FormField control={form.control} name="repaymentType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">
                                            Payment Type <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
                                            {/* Principal */}
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("Principal")}
                                                className={cn(
                                                    "relative flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all cursor-pointer",
                                                    field.value === "Principal"
                                                        ? "border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/20"
                                                        : "border-border bg-muted/30 hover:border-emerald-500/40 hover:bg-emerald-500/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", field.value === "Principal" ? "bg-emerald-500" : "bg-muted")}>
                                                        <TrendingDown className={cn("h-3.5 w-3.5", field.value === "Principal" ? "text-white" : "text-muted-foreground")} />
                                                    </div>
                                                    <span className={cn("text-sm font-bold", field.value === "Principal" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>Principal</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground leading-snug">Reduces outstanding balance</p>
                                                {field.value === "Principal" && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />}
                                            </button>

                                            {/* Profit */}
                                            <button
                                                type="button"
                                                onClick={() => field.onChange("Profit")}
                                                className={cn(
                                                    "relative flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all cursor-pointer",
                                                    field.value === "Profit"
                                                        ? "border-amber-500 bg-amber-500/10 shadow-sm shadow-amber-500/20"
                                                        : "border-border bg-muted/30 hover:border-amber-500/40 hover:bg-amber-500/5"
                                                )}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-lg", field.value === "Profit" ? "bg-amber-500" : "bg-muted")}>
                                                        <TrendingUp className={cn("h-3.5 w-3.5", field.value === "Profit" ? "text-white" : "text-muted-foreground")} />
                                                    </div>
                                                    <span className={cn("text-sm font-bold", field.value === "Profit" ? "text-amber-600 dark:text-amber-400" : "text-foreground")}>Profit</span>
                                                </div>
                                                <p className="text-[11px] text-muted-foreground leading-snug">Interest paid, balance unchanged</p>
                                                {field.value === "Profit" && <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-amber-500" />}
                                            </button>
                                        </div>

                                        {/* Context hint */}
                                        <p className={cn(
                                            "text-[11px] px-3 py-2 rounded-lg mt-1.5 border",
                                            repaymentType === "Principal"
                                                ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/8 border-emerald-500/20"
                                                : "text-amber-700 dark:text-amber-300 bg-amber-500/8 border-amber-500/20"
                                        )}>
                                            {repaymentType === "Principal"
                                                ? "💰 This amount will be deducted from the lender's outstanding balance."
                                                : "📈 This is a profit/interest payment. The lender's outstanding balance will NOT change."}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Date */}
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Date <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Calendar size={16} /></div>
                                                <Input type="date" className="h-10 pl-9 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Amount + Mode */}
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="amountPaid" render={({ field }) => (
                                        <FormItem className="col-span-2 sm:col-span-1">
                                            <FormLabel className="font-semibold">Amount (₹) <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><IndianRupee size={16} /></div>
                                                    <Input
                                                        type="number" min="0" step="1"
                                                        className="h-10 pl-9 bg-muted/50 border-border focus-visible:border-primary"
                                                        value={field.value || ""}
                                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="mode" render={({ field }) => (
                                        <FormItem className="col-span-2 sm:col-span-1">
                                            <FormLabel className="font-semibold">Mode <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-10 bg-muted/50 border-border">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Reference No */}
                                <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Reference No</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Transaction ID or cheque no" className="h-10 bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                {/* Remarks */}
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Remarks</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Optional remarks" rows={2} className="resize-none bg-muted/50 border-border focus-visible:border-primary" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-border bg-muted/30 p-4 pt-3 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button disabled={isPending} type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                                    <X size={16} className="mr-2" /> Cancel
                                </Button>
                                <Button disabled={isPending} type="submit" className="cursor-pointer bg-gradient-success text-white hover:opacity-90">
                                    {isPending
                                        ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</>
                                        : <><Plus size={16} className="mr-2" /> Record</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
