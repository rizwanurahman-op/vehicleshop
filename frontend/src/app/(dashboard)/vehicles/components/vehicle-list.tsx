"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@lib/currency";
import { formatDate } from "@lib/date";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Download, Bike, Car, Package, Eye, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Boxes, ArrowLeftRight } from "lucide-react";
import VehicleStatusBadge from "./vehicle-status-badge";
import VehicleTypeIcon from "./vehicle-type-icon";
import { VEHICLE_STATUSES } from "@data/vehicle-constants";

type VehicleListProps = { initialData: VehiclePaginatedData | null };

const fetchVehicles = async (params: Record<string, string | number>): Promise<VehiclePaginatedData | null> => {
    const response = await axios.get<ApiResponse<VehiclePaginatedData>>("/vehicles", { params });
    return response.data.data ?? null;
};

const VehicleList = ({ initialData }: VehicleListProps) => {
    const searchParams = useSearchParams();
    const defaultType = searchParams.get("type") || "";

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<string>(defaultType || "all");
    const [statusFilter, setStatusFilter] = useState("all");

    const vehicleType = activeTab !== "all" ? activeTab : undefined;

    const { data, isLoading } = useQuery<VehiclePaginatedData | null>({
        queryKey: ["vehicles", { page, search, vehicleType, statusFilter }],
        queryFn: () => fetchVehicles({
            page,
            limit: 15,
            ...(search && { search }),
            ...(vehicleType && { vehicleType }),
            ...(statusFilter !== "all" && { status: statusFilter }),
        }),
        initialData: activeTab === defaultType ? initialData : undefined,
        retry: 0,
    });

    const tabs = [
        { key: "two_wheeler", label: "Two Wheelers", icon: Bike },
        { key: "four_wheeler", label: "Four Wheelers", icon: Car },
        { key: "all", label: "All Vehicles", icon: Package },
    ];

    const vehicles = data?.data ?? [];
    const meta = data ? { total: data.total, page: data.page, totalPages: data.totalPages } : null;

    return (
        <div className="flex w-full flex-col gap-5 pb-6">
            {/* Page Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-brand shadow-lg">
                        <Package className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Vehicle Inventory</h1>
                        <p className="text-sm text-muted-foreground">Manage all purchased vehicles</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                        <Download className="mr-1.5 h-4 w-4" /> Export
                    </Button>
                    <Link href="/vehicles/new">
                        <Button className="bg-gradient-brand cursor-pointer text-white shadow-lg hover:opacity-90">
                            <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => { setActiveTab(tab.key); setPage(1); }}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                                activeTab === tab.key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by make, model, reg.no, seller..."
                        className="h-10 bg-muted/50 pl-9 border-border"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                    <SelectTrigger className="h-10 w-full sm:w-44 bg-muted/50 border-border">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {VEHICLE_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Vehicle</th>
                                <th className="px-4 py-3 text-left text-xs font-bold tracking-wider text-muted-foreground uppercase">Reg. No.</th>
                                <th className="px-4 py-3 text-right text-xs font-bold tracking-wider text-muted-foreground uppercase">Invested</th>
                                <th className="px-4 py-3 text-right text-xs font-bold tracking-wider text-muted-foreground uppercase">P&L</th>
                                <th className="px-4 py-3 text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-bold tracking-wider text-muted-foreground uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <td key={j} className="px-4 py-3"><div className="h-4 rounded bg-muted/60" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : vehicles.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                                                <Package className="h-7 w-7 text-muted-foreground" />
                                            </div>
                                            <p className="font-medium text-muted-foreground">No vehicles found</p>
                                            <Link href="/vehicles/new">
                                                <Button size="sm" className="bg-gradient-brand text-white">
                                                    <Plus className="mr-1.5 h-4 w-4" /> Add First Vehicle
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                vehicles.map((v) => {
                                    const isSold = v.dateSold && v.soldPrice;
                                    const pl = v.profitLoss;
                                    const isProfit = pl >= 0;

                                    return (
                                        <tr key={v._id} className="hover:bg-muted/20 transition-colors group">
                                            <td className="px-4 py-3">
                                                <VehicleTypeIcon type={v.vehicleType} className="text-muted-foreground" />
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(v.datePurchased)}</td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-semibold text-foreground">{v.make} {v.model}</p>
                                                    <p className="text-[11px] text-muted-foreground">{v.vehicleId} • from {v.purchasedFrom}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-md bg-muted/50 px-2 py-0.5 text-xs font-mono font-semibold text-foreground">
                                                    {v.registrationNo}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-semibold text-foreground">
                                                {formatCurrency(v.totalInvestment)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isSold ? (
                                                    <span className={cn("flex items-center justify-end gap-1 font-semibold text-xs", isProfit ? "text-emerald-400" : "text-red-400")}>
                                                        {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                                        {isProfit ? "+" : ""}{formatCurrency(pl)}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Unrealized</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <VehicleStatusBadge status={v.status} />
                                                    {v.saleStatus && <VehicleStatusBadge saleStatus={v.saleStatus} />}
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
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <Link href={`/vehicles/${v._id}`}>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <p className="text-xs text-muted-foreground">Showing page {meta.page} of {meta.totalPages} ({meta.total} vehicles)</p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 border-border">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="h-8 border-border">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats Bar */}
            {!isLoading && vehicles.length > 0 && (
                <div className="flex items-center gap-4 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total: <strong className="text-foreground">{meta?.total ?? 0}</strong></span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">In Stock: <strong className="text-emerald-400">{vehicles.filter((v) => v.status === "in_stock").length}</strong></span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">Sold: <strong className="text-indigo-400">{vehicles.filter((v) => v.status === "sold").length}</strong></span>
                </div>
            )}
        </div>
    );
};

export default VehicleList;
