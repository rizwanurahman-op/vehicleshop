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
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border hover:bg-transparent">
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Lender</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Borrowed</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Repaid</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">Balance</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground w-40">Repayment %</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(data ?? []).map(lender => (
                                    <TableRow key={lender._id} className="border-border hover:bg-muted/50 transition-colors">
                                        <TableCell>
                                            <div className="font-medium">{lender.name}</div>
                                            <div className="font-mono-id text-muted-foreground">{lender.lenderId}</div>
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
                )}
            </CardContent>
        </Card>
    );
};

export default SummaryTable;
