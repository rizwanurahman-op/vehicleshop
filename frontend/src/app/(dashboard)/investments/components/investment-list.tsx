"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { ArrowDownLeft, Search, Download, Edit, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateInvestmentDialog, UpdateInvestmentDialog, DeleteInvestmentDialog } from ".";
import { EmptyState, TableSkeleton, CurrencyDisplay, DateDisplay } from "@components/shared";
import { cn } from "@/lib/utils";
import { useDebounce } from "@hooks/use-debounce";
import { PAYMENT_MODES } from "@data";

const fetchInvestments = async (search: string, mode: string, lenderId: string): Promise<IInvestment[]> => {
    const res = await axios.get<ApiResponse<IInvestment[]>>("/investments", {
        params: { page: 1, limit: 100, search: search || undefined, mode: mode !== "all" ? mode : undefined, lenderId: lenderId || undefined },
    });
    return res.data.data ?? [];
};

type InvestmentListProps = { initialData: IInvestment[] | null };

const InvestmentList = ({ initialData }: InvestmentListProps) => {
    const [search, setSearch] = useState("");
    const [mode, setMode] = useState("all");
    const [editItem, setEditItem] = useState<IInvestment | null>(null);
    const [deleteItem, setDeleteItem] = useState<IInvestment | null>(null);
    const debouncedSearch = useDebounce(search, 400);

    const { data, isLoading } = useQuery<IInvestment[]>({
        queryKey: ["investments", debouncedSearch, mode],
        queryFn: () => fetchInvestments(debouncedSearch, mode, ""),
        initialData: initialData ?? undefined,
        retry: 0,
    });

    return (
        <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <ArrowDownLeft className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Investments</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">All money received from lenders</p>
                </div>
                <CreateInvestmentDialog />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search investments…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/50 h-10" />
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
                <Button variant="outline" className="cursor-pointer border-border hover:bg-muted h-10" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_URL}/investments/export/csv`, "_blank")}>
                    <Download size={16} className="mr-2" /> Export
                </Button>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : !data || data.length === 0 ? (
                    <EmptyState icon={ArrowDownLeft} title="No investments yet" description="Record the first investment from a lender." action={<CreateInvestmentDialog />} />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Amount</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mode</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(inv => {
                                    const lender = inv.lender as ILender;
                                    return (
                                        <TableRow key={inv._id} className="border-border hover:bg-muted/50 transition-colors">
                                            <TableCell><span className="font-mono-id text-primary">{inv.investmentId}</span></TableCell>
                                            <TableCell><DateDisplay date={inv.date} className="text-muted-foreground" /></TableCell>
                                            <TableCell>
                                                <div className="font-medium">{lender?.name || "—"}</div>
                                                <div className="font-mono-id text-muted-foreground">{lender?.lenderId || ""}</div>
                                            </TableCell>
                                            <TableCell className="text-right"><CurrencyDisplay amount={inv.amountReceived} /></TableCell>
                                            <TableCell><Badge variant="outline" className="text-[11px]">{inv.mode}</Badge></TableCell>
                                            <TableCell><span className="text-xs text-muted-foreground">{inv.notes || "—"}</span></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(inv)}><Edit size={14} /></Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteItem(inv)}><Trash2 size={14} /></Button>
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

            {editItem && <UpdateInvestmentDialog investment={editItem} open={!!editItem} onOpenChange={open => !open && setEditItem(null)} />}
            {deleteItem && <DeleteInvestmentDialog investment={deleteItem} open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)} />}
        </div>
    );
};

export default InvestmentList;
