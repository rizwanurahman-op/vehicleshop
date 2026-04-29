"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { formatApiErrors } from "@lib/formatApiErrors";
import { createVehicleOwnerSchema } from "@schemas/consignment";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, UserCheck, Phone, MapPin, Loader2, User, Package, Pencil } from "lucide-react";
import { useDebounce } from "@hooks/use-debounce";

const fetchOwners = async (search?: string): Promise<VehicleOwnerPaginatedData | null> => {
    const res = await axios.get<ApiResponse<VehicleOwnerPaginatedData>>("/vehicle-owners", { params: { search, limit: 50 } });
    return res.data.data ?? null;
};

// ── Create/Edit Owner Dialog ──────────────────────────────────────
const OwnerDialog = ({ owner, onSuccess }: { owner?: IVehicleOwner; onSuccess: () => void }) => {
    const [open, setOpen] = useState(false);
    const [tid, setTid] = useState<string | number | undefined>();
    const isEdit = !!owner;

    const form = useForm<z.infer<typeof createVehicleOwnerSchema>>({
        resolver: zodResolver(createVehicleOwnerSchema),
        defaultValues: { name: owner?.name ?? "", phone: owner?.phone ?? "", address: owner?.address ?? "", remarks: owner?.remarks ?? "" },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: async (v: z.infer<typeof createVehicleOwnerSchema>) => {
            setTid(toast.loading(isEdit ? "Updating owner..." : "Creating owner..."));
            return isEdit
                ? axios.patch(`/vehicle-owners/${owner!._id}`, v)
                : axios.post("/vehicle-owners", v);
        },
        onSuccess: () => {
            toast.success(isEdit ? "Owner updated!" : "Owner created!", { id: tid });
            onSuccess();
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
                {isEdit
                    ? <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></Button>
                    : <Button className="bg-gradient-brand text-white hover:opacity-90 shadow-md cursor-pointer"><Plus className="mr-2 h-4 w-4" />Add Owner</Button>
                }
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-sm p-0 overflow-hidden flex flex-col rounded-2xl bg-card border-border max-h-[92vh] sm:w-full">
                <div className="glass-header relative p-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand shadow-lg"><UserCheck className="h-4 w-4 text-white" /></div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">{isEdit ? "Edit Owner" : "Add Owner"}</DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">Vehicle owner registry</DialogDescription>
                        </div>
                    </div>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(v => mutate(v))} className="flex flex-col flex-1 overflow-hidden min-h-0">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground">Name *</FormLabel>
                                    <FormControl><Input placeholder="Owner's full name" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground">Phone</FormLabel>
                                    <FormControl><Input placeholder="+91 9876543210" className="h-9 bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground">Address</FormLabel>
                                    <FormControl><Textarea placeholder="Full address..." rows={2} className="resize-none bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="remarks" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-semibold text-foreground">Remarks</FormLabel>
                                    <FormControl><Textarea placeholder="Any notes..." rows={2} className="resize-none bg-muted/50 border-border text-sm" {...field} /></FormControl>
                                </FormItem>
                            )} />
                        </div>
                        <div className="border-t border-border bg-muted/20 p-4 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border hover:bg-muted">Cancel</Button>
                                <Button type="submit" disabled={isPending} className="bg-gradient-brand text-white hover:opacity-90">
                                    {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEdit ? "Update" : "Add Owner")}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

// ── Owner Card ────────────────────────────────────────────────────
const OwnerCard = ({ owner, onClick }: { owner: IVehicleOwner; onClick: () => void }) => {
    const qc = useQueryClient();
    return (
        <div className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all cursor-pointer group" onClick={onClick}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 shrink-0">
                        <User className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                        <p className="font-bold text-foreground text-sm">{owner.name}</p>
                        <p className="text-xs font-mono text-muted-foreground">{owner.ownerId}</p>
                    </div>
                </div>
                <div onClick={e => e.stopPropagation()}>
                    <OwnerDialog owner={owner} onSuccess={() => qc.invalidateQueries({ queryKey: ["vehicle-owners"] })} />
                </div>
            </div>
            <div className="mt-4 space-y-1.5">
                {owner.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />{owner.phone}
                    </div>
                )}
                {owner.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{owner.address}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Main List ─────────────────────────────────────────────────────
export const VehicleOwnerList = ({ initialData }: { initialData: VehicleOwnerPaginatedData | null }) => {
    const router = useRouter();
    const qc = useQueryClient();
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 400);

    const { data, isLoading } = useQuery<VehicleOwnerPaginatedData | null>({
        queryKey: ["vehicle-owners", debouncedSearch],
        queryFn: () => fetchOwners(debouncedSearch || undefined),
        initialData: !debouncedSearch ? initialData : undefined,
    });

    const owners = data?.data ?? [];

    return (
        <div className="flex flex-col gap-5 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Vehicle Owners</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} owners in registry</p>
                </div>
                <OwnerDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["vehicle-owners"] })} />
            </div>

            <div className="relative max-w-xs">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search owners..." className="pl-8 h-9 bg-muted/50 border-border text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : owners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Package className="h-12 w-12 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No owners found</p>
                    <OwnerDialog onSuccess={() => qc.invalidateQueries({ queryKey: ["vehicle-owners"] })} />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {owners.map(o => (
                        <OwnerCard key={o._id} owner={o} onClick={() => router.push(`/vehicle-owners/${o._id}`)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default VehicleOwnerList;
