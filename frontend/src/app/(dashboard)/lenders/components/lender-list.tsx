"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { useRouter } from "next/navigation";
import { Users, Search, Download, Eye, Edit, ToggleLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateLenderDialog, DeleteLenderDialog, UpdateLenderDialog } from ".";
import { EmptyState, TableSkeleton, StatusBadge, CurrencyDisplay } from "@components/shared";
import { cn } from "@/lib/utils";
import { useDebounce } from "@hooks/use-debounce";

const fetchLenders = async (search: string, status: string): Promise<ILenderWithSummary[]> => {
    const res = await axios.get<ApiResponse<ILenderWithSummary[]>>("/lenders", {
        params: { page: 1, limit: 100, search: search || undefined, status },
    });
    return res.data.data ?? [];
};

type LenderListProps = { initialData: ILenderWithSummary[] | null };

const LenderList = ({ initialData }: LenderListProps) => {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("all");
    const [editLender, setEditLender] = useState<ILenderWithSummary | null>(null);
    const [deleteLender, setDeleteLender] = useState<ILenderWithSummary | null>(null);

    const debouncedSearch = useDebounce(search, 400);

    const { data, isLoading } = useQuery<ILenderWithSummary[]>({
        queryKey: ["lenders", debouncedSearch, status],
        queryFn: () => fetchLenders(debouncedSearch, status),
        initialData: initialData ?? undefined,
        retry: 0,
    });

    const handleExport = async () => {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}/lenders/export/csv`, "_blank");
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Users className="h-5 w-5 text-primary" />
                        </div>
                        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Lenders</h1>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Manage investor relationships and track capital</p>
                </div>
                <CreateLenderDialog />
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, ID, or phone…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 bg-muted/50 border-border h-10"
                    />
                </div>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-36 bg-muted/50 border-border h-10">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport} className="cursor-pointer border-border hover:bg-muted h-10">
                    <Download size={16} className="mr-2" /> Export CSV
                </Button>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : !data || data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No lenders yet"
                        description="Add your first investor to start tracking capital and repayments."
                        action={<CreateLenderDialog />}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">ID</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Name</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Total Borrowed</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Total Repaid</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Balance</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map(lender => (
                                    <TableRow
                                        key={lender._id}
                                        className="border-border hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => router.push(`/lenders/${lender._id}`)}
                                    >
                                        <TableCell>
                                            <span className="font-mono-id text-primary">{lender.lenderId}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-foreground">{lender.name}</div>
                                            {lender.phone && <div className="text-xs text-muted-foreground">{lender.phone}</div>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <CurrencyDisplay amount={lender.totalBorrowed} variant="primary" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <CurrencyDisplay amount={lender.totalRepaid} variant="success" />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <CurrencyDisplay
                                                amount={lender.balancePayable}
                                                variant={lender.balancePayable > 0 ? "warning" : "success"}
                                                className="font-bold"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={lender.isActive ? "active" : "inactive"} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => router.push(`/lenders/${lender._id}`)}
                                                >
                                                    <Eye size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setEditLender(lender)}
                                                >
                                                    <Edit size={14} />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteLender(lender)}
                                                >
                                                    <ToggleLeft size={14} />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Edit dialog */}
            {editLender && (
                <UpdateLenderDialog
                    lender={editLender}
                    open={!!editLender}
                    onOpenChange={open => !open && setEditLender(null)}
                />
            )}

            {/* Delete confirmation */}
            {deleteLender && (
                <DeleteLenderDialog
                    lender={deleteLender}
                    open={!!deleteLender}
                    onOpenChange={open => !open && setDeleteLender(null)}
                />
            )}
        </div>
    );
};

export default LenderList;
