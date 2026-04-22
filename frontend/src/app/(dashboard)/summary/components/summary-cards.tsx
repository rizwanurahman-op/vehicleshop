"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";
import { formatINR } from "@/lib/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatCardsSkeleton } from "@components/shared";

const fetchSummary = async (): Promise<ILenderSummary[]> => {
    const res = await axios.get<ApiResponse<ILenderSummary[]>>("/summary/lenders", { params: { page: 1, limit: 100 } });
    return res.data.data ?? [];
};

type SummaryCardsProps = { initialData: ILenderSummary[] | null };

const SummaryCards = ({ initialData }: SummaryCardsProps) => {
    const { data, isLoading } = useQuery<ILenderSummary[]>({
        queryKey: ["lender-summary"],
        queryFn: fetchSummary,
        initialData: initialData ?? undefined,
        retry: 0,
    });

    if (isLoading && !data) return <StatCardsSkeleton />;

    const totalBorrowed = (data ?? []).reduce((sum, l) => sum + l.totalBorrowed, 0);
    const totalRepaid = (data ?? []).reduce((sum, l) => sum + l.totalRepaid, 0);
    const totalOutstanding = totalBorrowed - totalRepaid;
    const overallRepayment = totalBorrowed > 0 ? (totalRepaid / totalBorrowed) * 100 : 0;

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="bg-card border-border">
                <CardContent className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Borrowed</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-primary">{formatINR(totalBorrowed)}</p>
                </CardContent>
            </Card>
            <Card className="bg-card border-border">
                <CardContent className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Repaid</p>
                    <p className="mt-2 font-mono text-2xl font-bold text-success">{formatINR(totalRepaid)}</p>
                    <div className="mt-3">
                        <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                            <span>Repayment rate</span>
                            <span>{overallRepayment.toFixed(1)}%</span>
                        </div>
                        <Progress value={overallRepayment} className="h-1.5" />
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-card border-border">
                <CardContent className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Balance</p>
                    <p className={`mt-2 font-mono text-2xl font-bold ${totalOutstanding > 0 ? "text-warning" : "text-success"}`}>
                        {formatINR(totalOutstanding)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{(data ?? []).length} total lenders</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default SummaryCards;
