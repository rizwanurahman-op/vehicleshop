"use client";

import { z } from "zod";
import { cn } from "@/lib/utils";
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
import { createLenderSchema } from "@schemas/lender";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, X, Plus, Phone, MapPin, Sparkles, Loader2, FileText } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

type FormData = z.infer<typeof createLenderSchema>;

const CreateLenderDialog = () => {
    const [open, setOpen] = useState(false);
    const [onAddToast, setOnAddToast] = useState<string | number | undefined>();
    const queryClient = useQueryClient();

    const form = useForm<FormData>({
        resolver: zodResolver(createLenderSchema),
        defaultValues: { name: "", phone: "", address: "", remarks: "" },
    });

    const createLenderRequest = async (values: FormData) => {
        setOnAddToast(toast.loading("Creating…", { description: "Please wait while we add the lender!" }));
        return await axios.post("/lenders", values);
    };

    const { mutate, isPending } = useMutation({
        mutationFn: createLenderRequest,
        onSuccess: () => {
            toast.success("Success!", { id: onAddToast, description: "Lender created successfully!" });
            queryClient.invalidateQueries({ queryKey: ["lenders"] });
            queryClient.invalidateQueries({ queryKey: ["lender-summary"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
            form.reset();
            setOpen(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            const fieldErrors = formatApiErrors(errorData?.errors);
            toast.error("Error!", { id: onAddToast, description: fieldErrors || errorData?.message || "An error occurred!" });
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen} aria-hidden={!open}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-brand cursor-pointer text-white shadow-lg hover:opacity-90">
                    <Plus size={18} className="mr-2" /> Add Lender
                </Button>
            </DialogTrigger>
            <DialogContent onOpenAutoFocus={e => e.preventDefault()} aria-label="Create Lender Dialog" className="w-[96vw] max-w-lg p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-4 sm:p-6">
                    <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
                    <div className="relative flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-brand shadow-lg glass-header-icon sm:h-14 sm:w-14">
                            <Users className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-primary" />
                                <span className="text-[10px] font-bold tracking-widest text-primary uppercase">New</span>
                            </div>
                            <DialogTitle className="m-0 text-lg font-bold text-foreground sm:text-2xl">Add Lender</DialogTitle>
                            <DialogDescription className="mt-0.5 hidden text-xs text-muted-foreground sm:mt-1 sm:block sm:text-sm">
                                Fill in the details to register a new investor
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <Form {...form}>
                    <form id="create-lender-form" onSubmit={form.handleSubmit(values => mutate(values))} className="flex w-full flex-1 flex-col overflow-hidden min-h-0">
                        <div className="flex-1 w-full overflow-y-auto scrollbar-thin">
                            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground font-semibold">Lender Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Users size={18} /></div>
                                                <Input placeholder="Enter lender name" className={cn("h-10 rounded-lg pl-10 sm:h-12", "bg-muted/50 border-border", "focus-visible:border-primary")} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground font-semibold">Phone</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"><Phone size={18} /></div>
                                                <Input placeholder="+91 9876543210" className={cn("h-10 rounded-lg pl-10 sm:h-12", "bg-muted/50 border-border", "focus-visible:border-primary")} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground font-semibold">Address</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-3 left-3"><MapPin size={18} /></div>
                                                <Textarea placeholder="Enter address" rows={2} className={cn("resize-none rounded-lg pt-3 pl-10", "bg-muted/50 border-border", "focus-visible:border-primary")} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="remarks" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-foreground font-semibold">Remarks</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="text-muted-foreground absolute top-3 left-3"><FileText size={18} /></div>
                                                <Textarea placeholder="Any additional notes" rows={2} className={cn("resize-none rounded-lg pt-3 pl-10", "bg-muted/50 border-border", "focus-visible:border-primary")} {...field} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="border-border bg-muted/30 border-t p-4 pt-3 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button disabled={isPending} type="button" variant="outline" onClick={() => setOpen(false)} className={cn("cursor-pointer", "border-border text-foreground", "hover:bg-muted")}>
                                    <X size={18} className="mr-2" /> Cancel
                                </Button>
                                <Button disabled={isPending} type="submit" form="create-lender-form" className={cn("cursor-pointer", "bg-gradient-brand text-white", "shadow-md hover:opacity-90")}>
                                    {isPending ? <><Loader2 size={18} className="mr-2 animate-spin" /> Creating…</> : <><Plus size={18} className="mr-2" /> Add Lender</>}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateLenderDialog;
