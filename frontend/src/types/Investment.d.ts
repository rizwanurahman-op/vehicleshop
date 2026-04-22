type PaymentMode = "Cash" | "Online" | "Cheque" | "UPI";

interface IInvestment {
    _id: string;
    investmentId: string;
    date: string;
    lender: ILender | string;
    amountReceived: number;
    mode: PaymentMode;
    referenceNo?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface InvestmentPaginatedData {
    items: IInvestment[];
    meta: PaginationMeta;
}
