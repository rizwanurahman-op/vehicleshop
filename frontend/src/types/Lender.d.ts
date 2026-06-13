interface ILender {
    _id: string;
    lenderId: string;
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ILenderWithSummary extends ILender {
    totalBorrowed: number;
    totalRepaid: number;       // Principal repayments only — reduces balance
    totalProfit: number;       // Profit/interest paid — does not reduce balance
    balancePayable: number;
    repaymentPercentage?: number;
    investmentCount?: number;
    repaymentCount?: number;
    profitCount?: number;
}

interface LenderPaginatedData {
    items: ILenderWithSummary[];
    meta: PaginationMeta;
}
