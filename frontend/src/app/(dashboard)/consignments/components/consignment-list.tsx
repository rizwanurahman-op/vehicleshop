"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Plus, Search, Store, CreditCard, Bike, Car, Loader2,
    TrendingUp, TrendingDown, Package, IndianRupee, AlertCircle,
    CheckCircle2, Clock, RotateCcw, Filter, ArrowLeftRight
} from "lucide-react";
import Link from "next/link";
import { useDebounce } from "@hooks/use-debounce";

const fetchConsignments = async (params: Record<string, string>): Promise<ConsignmentPaginatedData | null> => {
    const res = await axios.get<ApiResponse<ConsignmentPaginatedData>>("/consignments", { params });
    return res.data.data ?? null;
};

const SaleTypeBadge = ({ type }: { type: SaleType }) => (
    <span className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
        type === "park_sale"
            ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
    )}>
        {type === "park_sale" ? <><Store className="h-2.5 w-2.5" /> Park</> : <><CreditCard className="h-2.5 w-2.5" /> Finance</>}
    </span>
);

const StatusBadge = ({ status, settlement }: { status: ConsignmentStatus; settlement: SettlementStatus }) => {
    if (settlement === "fully_closed") return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]"><CheckCircle2 className="mr-1 h-2.5 w-2.5" />Closed</Badge>;
    if (status === "sold" || status === "sold_pending") {
        return (
            <div className="flex flex-col gap-0.5">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]"><CheckCircle2 className="mr-1 h-2.5 w-2.5" />Sold</Badge>
                {settlement !== "buyer_settled" && settlement !== "fully_closed" && (
                    <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]"><AlertCircle className="mr-1 h-2.5 w-2.5" />Pending</Badge>
                )}
            </div>
        );
    }
    const map: Record<string, { label: string; color: string }> = {
        received: { label: "Received", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
        reconditioning: { label: "Workshop", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
        ready_for_sale: { label: "Ready", color: "bg-green-500/10 text-green-400 border-green-500/20" },
        returned: { label: "Returned", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    };
    const s = map[status] ?? map.received;
    return <Badge className={cn("text-[10px]", s.color)}>{s.label}</Badge>;
};

const QuickStat = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold", color ?? "text-foreground")}>{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
);

export const ConsignmentList = ({ initialData }: { initialData: ConsignmentPaginatedData | null }) => {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [saleType, setSaleType] = useState<string>("all");
    const [status, setStatus] = useState<string>("all");
    const debouncedSearch = useDebounce(search, 400);

    const params: Record<string, string> = { page: "1", limit: "20" };
    if (saleType !== "all") params.saleType = saleType;
    if (status !== "all") params.status = status;
    if (debouncedSearch) params.search = debouncedSearch;

    const { data, isLoading } = useQuery<ConsignmentPaginatedData | null>({
        queryKey: ["consignments", params],
        queryFn: () => fetchConsignments(params),
        initialData: saleType === "all" && status === "all" && !debouncedSearch ? initialData : undefined,
    });

    const vehicles = data?.data ?? [];
    const inShop = vehicles.filter(v => !["sold", "sold_pending", "returned"].includes(v.status)).length;
    const sold = vehicles.filter(v => ["sold", "sold_pending"].includes(v.status)).length;
    const totalInvested = vehicles.reduce((s, v) => s + v.totalInvestment, 0);

    return (
        <div className="flex flex-col gap-5 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Consignment Inventory</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Park Sale & Finance Sale vehicles</p>
                </div>
                <Link href="/consignments/new">
                    <Button className="bg-gradient-brand text-white hover:opacity-90 shadow-md cursor-pointer">
                        <Plus className="mr-2 h-4 w-4" /> New Consignment
                    </Button>
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <QuickStat label="Total" value={String(data?.total ?? 0)} />
                <QuickStat label="In Shop" value={String(inShop)} color="text-yellow-400" />
                <QuickStat label="Sold" value={String(sold)} color="text-emerald-400" />
                <QuickStat label="Invested" value={formatCurrency(totalInvested)} sub="Reconditioning + Purchase" />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                {/* Sale Type Tabs */}
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                    {[
                        { value: "all", label: "All" },
                        { value: "park_sale", label: "🏪 Park Sale", icon: Store },
                        { value: "finance_sale", label: "💳 Finance Sale", icon: CreditCard },
                    ].map(t => (
                        <button key={t.value} onClick={() => setSaleType(t.value)}
                            className={cn("px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                saleType === t.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="relative flex-1 min-w-[180px] max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search vehicles..." className="pl-8 h-9 bg-muted/50 border-border text-sm" value={search} onChange={e => setSearch(e.target.value)} />
                </div>

                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-9 w-36 bg-muted/50 border-border text-sm">
                        <Filter className="h-3 w-3 mr-1" /><SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="reconditioning">Workshop</SelectItem>
                        <SelectItem value="ready_for_sale">Ready for Sale</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                        <SelectItem value="sold_pending">Sold (Pending)</SelectItem>
                        <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : vehicles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3">
                        <Package className="h-12 w-12 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No consignment vehicles found</p>
                        <Link href="/consignments/new"><Button variant="outline" size="sm">Register First Vehicle</Button></Link>
                    </div>
                ) : (
                    <>
                        {/* Table Header */}
                        <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-border bg-muted/30">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-6"></div>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Vehicle</p>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Received</p>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Investment</p>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                        </div>

                        {/* Rows */}
                        {vehicles.map((v, i) => {
                            const VehicleIcon = v.vehicleType === "two_wheeler" ? Bike : Car;
                            const isSold = !!(v.dateSold && v.soldPrice);
                            const isProfit = v.netProfit >= 0;

                            return (
                                <div key={v._id}
                                    className={cn("grid sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 sm:gap-4 px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors", i > 0 ? "border-t border-border" : "")}
                                    onClick={() => router.push(`/consignments/${v._id}`)}>

                                    <div className="flex items-center">
                                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shadow-sm", v.saleType === "park_sale" ? "bg-violet-500/10" : "bg-blue-500/10")}>
                                            <VehicleIcon className={cn("h-4 w-4", v.saleType === "park_sale" ? "text-violet-400" : "text-blue-400")} />
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-foreground text-sm">{v.make} {v.model}</span>
                                            <SaleTypeBadge type={v.saleType} />
                                            <span className="text-xs font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{v.consignmentId}</span>
                                            {v.isExchange && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                                    <ArrowLeftRight className="h-2.5 w-2.5" />Sold via Exchange
                                                </span>
                                            )}
                                            {v.isFromExchange && (
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                    <ArrowLeftRight className="h-2.5 w-2.5" />From Exchange
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                            <span className="font-mono">{v.registrationNo}</span>
                                            <span>•</span>
                                            <span>{v.previousOwner}</span>
                                            {v.daysInShop != null && (
                                                <><span>•</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" />{v.daysInShop}d</span></>
                                            )}
                                        </div>
                                        {/* Mobile: sold price + profit */}
                                        {isSold && (
                                            <div className="flex items-center gap-2 mt-1 sm:hidden text-xs">
                                                <span className="text-muted-foreground">{formatCurrency(v.soldPrice!)}</span>
                                                <span className={isProfit ? "text-emerald-400" : "text-red-400"}>
                                                    {isProfit ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                                                    {formatCurrency(Math.abs(v.netProfit))}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="hidden sm:flex items-center text-xs text-muted-foreground">
                                        {formatDate(v.dateReceived)}
                                    </div>

                                    <div className="hidden sm:flex items-center">
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-foreground">{formatCurrency(v.totalInvestment)}</p>
                                            {isSold && (
                                                <p className={cn("text-[11px]", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                    {isProfit ? "+" : ""}{formatCurrency(v.netProfit)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <StatusBadge status={v.status} settlement={v.settlementStatus} />
                                    </div>
                                </div>
                            );
                        })}

                        {/* Footer pagination info */}
                        {(data?.total ?? 0) > 20 && (
                            <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                                Showing {vehicles.length} of {data?.total} consignments
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ConsignmentList;
