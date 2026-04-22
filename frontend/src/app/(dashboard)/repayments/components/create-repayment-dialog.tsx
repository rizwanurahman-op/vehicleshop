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
import { ScrollArea } from "@/components/ui/scroll-area";
import { createRepaymentSchema } from "@schemas/repayment";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { ArrowUpRight, X, Plus, Calendar, Loader2, IndianRupee, Sparkles } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODES } from "@data";

type FormData = z.infer<typeof createRepaymentSchema>;

const fetchLendersForSelect = async (): Promise<ILender[]> => {
    const res = await axios.get<ApiResponse<ILender[]>>("/lenders", { params: { status: "active", limit: 100 } });
    return res.data.data ?? [];
};

const CreateRepaymentDialog = () => {
    const [open, setOpen] = useState(false);
    const [toastId, setToastId] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const { data: lenders = [] } = useQuery<ILender[]>({
        queryKey: ["lenders-active"],
        queryFn: fetchLendersForSelect,
        enabled: open,
    });

    const form = useForm<FormData>({
        resolver: zodResolver(createRepaymentSchema),
        defaultValues: { date: new Date().toISOString().split("T")[0], lender: "", amountPaid: 0, mode: "Cash", referenceNo: "", remarks: "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (values: FormData) => {
            setToastId(toast.loading("Recording…", { description: "Saving repayment record." }));
            return await axios.post("/repayments", values);
        },
        onSuccess: () => {
            toast.success("Recorded!", { id: toastId });
            queryClient.invalidateQueries({ queryKey: ["repayments"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["lender-summary"] });
            form.reset({ date: new Date().toISOString().split("T")[0], lender: "", amountPaid: 0, mode: "Cash" });
            setOpen(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            toast.error("Error!", { id: toastId, description: formatApiErrors(errorData?.errors) || errorData?.message });
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-success cursor-pointer text-white shadow-lg hover:opacity-90">
                    <Plus size={18} className="mr-2" /> Record Repayment
                </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} className="overflow-hidden p-0 sm:max-w-lg max-h-[90vh] flex flex-col bg-card border-border">
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
                            <DialogTitle className="m-0 text-lg font-bold text-foreground sm:text-2xl">Record Repayment</DialogTitle>
                            <DialogDescription className="mt-0.5 hidden text-xs text-muted-foreground sm:mt-1 sm:block sm:text-sm">
                                Return money to an active lender
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form id="create-repayment-form" onSubmit={form.handleSubmit(values => mutate(values))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
                                <FormField control={form.control} name="lender" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Lender <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <SelectTrigger className="h-10 bg-muted/50 border-border"><SelectValue placeholder="Select lender" /></SelectTrigger>
                                                <SelectContent>{lenders.map(l => <SelectItem key={l._id} value={l._id}>{l.lenderId} — {l.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Date <span className="text-destructive">*</span></FormLabel>
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
                                            <FormLabel className="font-semibold">Amount (₹) <span className="text-destructive">*</span></FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><IndianRupee size={16} /></div>
                                                    <Input type="number" min="0" step="1" className="h-10 pl-9 bg-muted/50 border-border" value={field.value || ""} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="mode" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold">Mode <span className="text-destructive">*</span></FormLabel>
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
                                        <FormControl><Input placeholder="Transaction ID or cheque no" className="h-10 bg-muted/50 border-border" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold">Remarks</FormLabel>
                                        <FormControl><Textarea placeholder="Optional remarks" rows={2} className="resize-none bg-muted/50 border-border" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>
                        <div className="border-t border-border bg-muted/30 p-4 pt-3 flex justify-end gap-3">
                            <Button disabled={isPending} type="button" variant="outline" onClick={() => setOpen(false)} className="cursor-pointer"><X size={16} className="mr-2" /> Cancel</Button>
                            <Button disabled={isPending} type="submit" className="cursor-pointer bg-gradient-success text-white hover:opacity-90">
                                {isPending ? <><Loader2 size={16} className="mr-2 animate-spin" /> Saving…</> : <><Plus size={16} className="mr-2" /> Record</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateRepaymentDialog;
