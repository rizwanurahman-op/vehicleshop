"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { TableSkeleton, CurrencyDisplay, StatusBadge } from "@components/shared";
import { cn } from "@/lib/utils";

const fetchSummary = async (): Promise<ILenderSummary[]> => {
    const res = await axios.get<ApiResponse<ILenderSummary[]>>("/summary/lenders", { params: { page: 1, limit: 100 } });
    return res.data.data ?? [];
};

type SummaryTableProps = { initialData: ILenderSummary[] | null };

const SummaryTable = ({ initialData }: SummaryTableProps) => {
    const { data, isLoading } = useQuery<ILenderSummary[]>({
        queryKey: ["lender-summary"],
        queryFn: fetchSummary,
        initialData: initialData ?? undefined,
        retry: 0,
    });

    return (
        <Card className="bg-card border-border overflow-hidden">
            <CardContent className="p-0">
                {isLoading && !data ? (
                    <div className="p-4"><TableSkeleton rows={5} /></div>
                ) : (
                    <>
                        {/* Mobile Cards View (< md) */}
                        <div className="grid grid-cols-1 gap-4 p-4 md:hidden bg-muted/10">
                            {(data ?? []).map(lender => (
                                <div key={lender._id} className="group relative flex flex-col rounded-2xl border border-border/60 bg-gradient-to-b from-card to-muted/10 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden">
                                    <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-50 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary/50 to-primary" />
                                    
                                    <div className="relative flex items-center justify-between mb-4">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Lender Summary</p>
                                        </div>
                                        <StatusBadge status={lender.isActive ? "active" : "inactive"} />
                                    </div>

                                    <div className="relative mb-5 flex flex-col items-start">
                                        <p className="text-lg font-bold text-foreground tracking-tight leading-none mb-1.5 group-hover:text-primary transition-colors">{lender.name}</p>
                                    </div>

                                    <div className="relative mt-auto pt-4 border-t border-border/60 border-dashed">
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Borrowed</p>
                                                <p className="font-bold text-foreground tabular-nums leading-none"><CurrencyDisplay amount={lender.totalBorrowed} /></p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Repaid</p>
                                                <p className="font-bold text-success tabular-nums leading-none"><CurrencyDisplay amount={lender.totalRepaid} /></p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 bg-muted/30 p-3 rounded-lg border border-border/50">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-muted-foreground">Balance</span>
                                                <span className="font-bold tabular-nums"><CurrencyDisplay amount={lender.balancePayable} variant={lender.balancePayable > 0 ? "warning" : "success"} /></span>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Progress</span>
                                                <Progress value={Math.min(lender.repaymentPercentage, 100)} className="h-1.5 flex-1" />
                                                <span className={cn("text-[10px] font-bold tabular-nums",
                                                    lender.repaymentPercentage >= 100 ? "text-success" : lender.repaymentPercentage >= 50 ? "text-warning" : "text-destructive"
                                                )}>
                                                    {lender.repaymentPercentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                            <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-12 text-center">#</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Borrowed</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Repaid</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Balance</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-40">Repayment %</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data ?? []).map((lender, index) => (
                                    <TableRow key={lender._id} className="border-border hover:bg-muted/50 transition-colors">
                                        <TableCell className="text-center text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{lender.name}</div>
                                        </TableCell>
                                        <TableCell className="text-right"><CurrencyDisplay amount={lender.totalBorrowed} variant="primary" /></TableCell>
                                        <TableCell className="text-right"><CurrencyDisplay amount={lender.totalRepaid} variant="success" /></TableCell>
                                        <TableCell className="text-right">
                                            <CurrencyDisplay
                                                amount={lender.balancePayable}
                                                variant={lender.balancePayable > 0 ? "warning" : "success"}
                                                className="font-bold"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Progress value={Math.min(lender.repaymentPercentage, 100)} className="h-1.5 flex-1" />
                                                <span className={cn("text-xs font-medium tabular-nums min-w-[3rem] text-right",
                                                    lender.repaymentPercentage >= 100 ? "text-success" : lender.repaymentPercentage >= 50 ? "text-warning" : "text-destructive"
                                                )}>
                                                    {lender.repaymentPercentage.toFixed(0)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={lender.isActive ? "active" : "inactive"} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default SummaryTable;
