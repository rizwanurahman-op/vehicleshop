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
                    <>
                        {/* Mobile Cards View (< md) */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                            {data.map((inv) => {
                                const lender = inv.lender as ILender;
                                return (
                                    <div key={inv._id} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
                                        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary/50 to-primary" />
                                        
                                        {/* Header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                                    <ArrowDownLeft className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Investment</p>
                                                </div>
                                            </div>
                                            <DateDisplay date={inv.date} className="text-xs font-semibold text-foreground" />
                                        </div>

                                        {/* Lender Details */}
                                        <div className="relative mb-5">
                                            <p className="text-lg font-bold text-foreground tracking-tight leading-none mb-1.5">{lender?.name || "—"}</p>
                                        </div>

                                        {/* Financial details */}
                                        <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                            <div className="flex items-end justify-between mb-3">
                                                <div>
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Mode</p>
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/50">{inv.mode}</Badge>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Amount</p>
                                                    <p className="text-xl font-bold text-primary tabular-nums leading-none"><CurrencyDisplay amount={inv.amountReceived} /></p>
                                                </div>
                                            </div>
                                            {inv.notes && (
                                                <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg line-clamp-2 mt-2">{inv.notes}</p>
                                            )}
                                        </div>

                                        <div className="mt-4 pt-3 flex items-center justify-end gap-2 border-t border-border/60 border-dashed">
                                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs bg-muted/30" onClick={() => setEditItem(inv)}>
                                                <Edit size={14} className="mr-1.5" /> Edit
                                            </Button>
                                            <Button variant="outline" size="sm" className="h-8 px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 bg-muted/30" onClick={() => setDeleteItem(inv)}>
                                                <Trash2 size={14} className="mr-1.5" /> Delete
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Date</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Amount</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Mode</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Notes</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((inv, index) => {
                                        const lender = inv.lender as ILender;
                                        return (
                                            <TableRow key={inv._id} className="border-border hover:bg-muted/50 transition-colors group">
                                                <TableCell className="text-center text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                                                <TableCell><DateDisplay date={inv.date} className="text-muted-foreground" /></TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{lender?.name || "—"}</div>
                                                </TableCell>
                                                <TableCell className="text-right"><CurrencyDisplay amount={inv.amountReceived} /></TableCell>
                                                <TableCell><Badge variant="outline" className="text-[11px]">{inv.mode}</Badge></TableCell>
                                                <TableCell><span className="text-xs text-muted-foreground">{inv.notes || "—"}</span></TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    </>
                )}
            </div>

            {editItem && <UpdateInvestmentDialog investment={editItem} open={!!editItem} onOpenChange={open => !open && setEditItem(null)} />}
            {deleteItem && <DeleteInvestmentDialog investment={deleteItem} open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)} />}
        </div>
    );
};

export default InvestmentList;
