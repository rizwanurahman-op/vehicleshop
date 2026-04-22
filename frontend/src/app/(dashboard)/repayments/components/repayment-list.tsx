"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { ArrowUpRight, Search, Download, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateRepaymentDialog, UpdateRepaymentDialog, DeleteRepaymentDialog } from ".";
import { EmptyState, TableSkeleton, CurrencyDisplay, DateDisplay } from "@components/shared";
import { useDebounce } from "@hooks/use-debounce";
import { PAYMENT_MODES } from "@data";

const fetchRepayments = async (mode: string): Promise<IRepayment[]> => {
    const res = await axios.get<ApiResponse<IRepayment[]>>("/repayments", {
        params: { page: 1, limit: 100, mode: mode !== "all" ? mode : undefined },
    });
    return res.data.data ?? [];
};

type RepaymentListProps = { initialData: IRepayment[] | null };

const RepaymentList = ({ initialData }: RepaymentListProps) => {
    const [search, setSearch] = useState("");
    const [mode, setMode] = useState("all");
    const [editItem, setEditItem] = useState<IRepayment | null>(null);
    const [deleteItem, setDeleteItem] = useState<IRepayment | null>(null);
    const debouncedSearch = useDebounce(search, 400);

    const { data, isLoading } = useQuery<IRepayment[]>({
        queryKey: ["repayments", mode, debouncedSearch],
        queryFn: () => fetchRepayments(mode),
        initialData: initialData ?? undefined,
        retry: 0,
    });

    const filtered = (data ?? []).filter(r => {
        if (!debouncedSearch) return true;
        const lender = r.lender as ILender;
        return (
            r.repaymentId.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            lender?.name?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
    });

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
                            <ArrowUpRight className="h-5 w-5 text-success" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Repayments</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">All money paid back to lenders</p>
                </div>
                <CreateRepaymentDialog />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search repayments…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50 h-10" />
                </div>
                <Select value={mode} onValueChange={setMode}>
                    <SelectTrigger className="w-36 bg-muted/50 h-10">
                        <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="outline" className="cursor-pointer h-10" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/repayments/export/csv`, "_blank")}>
                    <Download size={16} className="mr-2" /> Export
                </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={ArrowUpRight} title="No repayments yet" description="Record a repayment to a lender." action={<CreateRepaymentDialog />} />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Amount Paid</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mode</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Remarks</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(rep => {
                                    const lender = rep.lender as ILender;
                                    return (
                                        <TableRow key={rep._id} className="border-border hover:bg-muted/50 transition-colors">
                                            <TableCell><span className="font-mono-id text-success">{rep.repaymentId}</span></TableCell>
                                            <TableCell><DateDisplay date={rep.date} className="text-muted-foreground" /></TableCell>
                                            <TableCell>
                                                <div className="font-medium">{lender?.name || "—"}</div>
                                                <div className="font-mono-id text-muted-foreground">{lender?.lenderId || ""}</div>
                                            </TableCell>
                                            <TableCell className="text-right"><CurrencyDisplay amount={rep.amountPaid} variant="success" /></TableCell>
                                            <TableCell><Badge variant="outline" className="text-[11px]">{rep.mode}</Badge></TableCell>
                                            <TableCell><span className="text-xs text-muted-foreground">{rep.remarks || "—"}</span></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(rep)}><Edit size={14} /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteItem(rep)}><Trash2 size={14} /></Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {editItem && <UpdateRepaymentDialog repayment={editItem} open={!!editItem} onOpenChange={open => !open && setEditItem(null)} />}
            {deleteItem && <DeleteRepaymentDialog repayment={deleteItem} open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)} />}
        </div>
    );
};

export default RepaymentList;
