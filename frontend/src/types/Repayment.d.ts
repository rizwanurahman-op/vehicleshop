interface IRepayment {
    _id: string;
    repaymentId: string;
    date: string;
    lender: ILender | string;
    amountPaid: number;
    mode: PaymentMode;
    referenceNo?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

interface RepaymentPaginatedData {
    items: IRepayment[];
    meta: PaginationMeta;
}
