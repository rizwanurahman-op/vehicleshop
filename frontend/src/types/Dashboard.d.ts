interface ILenderSummary {
    _id: string;
    lenderId: string;
    name: string;
    phone?: string;
    isActive: boolean;
    totalBorrowed: number;
    totalRepaid: number;       // Principal only — reduces balance
    totalProfit: number;       // Profit/interest paid — does not reduce balance
    balancePayable: number;
    repaymentPercentage: number;
}

interface IVehicleStats {
    total: number;
    inStock: number;
    sold: number;
    soldPending: number;
    exchanged: number;
    totalRevenue: number;
    totalInvested: number;
    netProfit: number;
    balancePending: number;
    balancePendingAmt: number;
}

interface IConsignmentStats {
    total: number;
    active: number;
    sold: number;
    parkSale: number;
    financeSale: number;
    netProfit: number;
    totalRevenue: number;
}

interface IDashboardStats {
    totalLenders: number;
    activeLenders: number;
    totalBorrowed: number;
    totalRepaid: number;       // Principal only — reduces balance
    totalProfit: number;       // Profit/interest paid — does not reduce balance
    totalOutstanding: number;
    vehicleStats: IVehicleStats;
    consignmentStats: IConsignmentStats;
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
    repaymentType?: string;    // "Principal" | "Profit" | undefined (investments)
}

interface IMonthlyTrend {
    year: number;
    month: number;
    totalInvested: number;
    totalRepaid: number;       // Principal only
    totalProfit: number;       // Profit only
}
