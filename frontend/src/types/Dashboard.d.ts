interface ILenderSummary {
    _id: string;
    lenderId: string;
    name: string;
    phone?: string;
    isActive: boolean;
    totalBorrowed: number;
    totalRepaid: number;
    balancePayable: number;
    repaymentPercentage: number;
}

interface IDashboardStats {
    totalLenders: number;
    activeLenders: number;
    totalBorrowed: number;
    totalRepaid: number;
    totalOutstanding: number;
    recentTransactions: IRecentTransaction[];
    monthlyTrend: IMonthlyTrend[];
    topOutstanding: { _id: string; lenderId: string; name: string; balance: number }[];
}

interface IRecentTransaction {
    id: string;
    date: string;
    type: "investment" | "repayment";
    lenderName: string;
    lenderId: string;
    amount: number;
    mode: string;
}

interface IMonthlyTrend {
    year: number;
    month: number;
    totalInvested: number;
    totalRepaid: number;
}
