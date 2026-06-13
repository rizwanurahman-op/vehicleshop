"use client";

import { z } from "zod";
import { useEffect, useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { updateRepaymentSchema } from "@schemas/repayment";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, X, Save, Calendar, Loader2, IndianRupee, TrendingDown, TrendingUp } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES } from "@data";
import { formatDateInput } from "@/lib/date";
import { cn } from "@/lib/utils";

type FormData = z.infer<typeof updateRepaymentSchema>;
type Props = { repayment: IRepayment; open: boolean; onOpenChange: (open: boolean) => void };

const UpdateRepaymentDialog = ({ repayment, open, onOpenChange }: Props) => {
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm<FormData>({
        resolver: zodResolver(updateRepaymentSchema),
        defaultValues: {
            date: formatDateInput(repayment.date),
            amountPaid: repayment.amountPaid,
            mode: repayment.mode,
            repaymentType: repayment.repaymentType ?? "Principal",
            referenceNo: repayment.referenceNo || "",
            remarks: repayment.remarks || "",
        },
    });

    useEffect(() => {
        form.reset({
            date: formatDateInput(repayment.date),
            amountPaid: repayment.amountPaid,
            mode: repayment.mode,
            repaymentType: repayment.repaymentType ?? "Principal",
            referenceNo: repayment.referenceNo || "",
            remarks: repayment.remarks || "",
        });
    }, [repayment, form]);

    const repaymentType = form.watch("repaymentType");

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setToastId(toast.loading("Saving…", { description: "Updating repayment." }));
            return await axios.patch(`/repayments/${repayment._id}`, values);
        },
        onSuccess: () => {
            toast.success("Updated!", { id: toastId });
            queryClient.invalidateQueries({ queryKey: ["repayments"] });
            queryClient.invalidateQueries({ queryKey: ["repayment-stats"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["lenders"] });
            queryClient.invalidateQueries({ queryKey: ["lender-stats"] });
            queryClient.invalidateQueries({ queryKey: ["lender-summary"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[96vw] max-w-md p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-4 sm:p-6">
                    <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-success/10 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-success/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-success shadow-lg glass-header-icon">
                            <ArrowUpRight className="h-5 w-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-lg font-bold text-foreground">Edit Repayment</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">Update payout entry for {typeof repayment.lender === "object" ? repayment.lender?.name : repayment.lender}</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form id="update-repayment-form" onSubmit={form.handleSubmit(values => mutate(values))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:p-6">

                                {/* Repayment Type Selector */}
                                <FormField control={form.control} name="repaymentType" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Payment Type</FormLabel>
                                        <div className="grid grid-cols-2 gap-2 mt-1">
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

                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Date</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Calendar size={16} /></div>
                                                <Input type="date" className="h-10 pl-9 bg-muted/50 border-border" {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-2 gap-3">
                                    <FormField control={form.control} name="amountPaid" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold">Amount (₹)</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><IndianRupee size={16} /></div>
                                                    <Input type="number" className="h-10 pl-9 bg-muted/50 border-border" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="mode" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold">Mode</FormLabel>
                                            <FormControl>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <SelectTrigger className="h-10 bg-muted/50 border-border"><SelectValue /></SelectTrigger>
                                                    <SelectContent>{PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <FormField control={form.control} name="referenceNo" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Reference No</FormLabel>
                                        <FormControl><Input className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Remarks</FormLabel>
                                        <FormControl><Textarea rows={2} className="resize-none bg-muted/50 border-border" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                        <div className="border-t border-border bg-muted/30 p-4 pt-3 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button disabled={isPending} type="button" variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer border-border hover:bg-muted">
                                    <X size={16} className="mr-2" /> Cancel
                                </Button>
                                <Button disabled={isPending} type="submit" className="cursor-pointer bg-gradient-success text-white hover:opacity-90">
                                    {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Save size={16} className="mr-2" /> Save</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default UpdateRepaymentDialog;
