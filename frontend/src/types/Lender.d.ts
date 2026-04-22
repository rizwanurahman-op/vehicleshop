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
    totalRepaid: number;
    balancePayable: number;
    repaymentPercentage?: number;
    investmentCount?: number;
    repaymentCount?: number;
}

interface LenderPaginatedData {
    items: ILenderWithSummary[];
    meta: PaginationMeta;
}
