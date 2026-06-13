interface IRepayment {
    _id: string;
    repaymentId: string;
    date: string;
    lender: ILender | string;
    amountPaid: number;
    mode: PaymentMode;
    repaymentType: "Principal" | "Profit";
    referenceNo?: string;
    remarks?: string;
    createdAt: string;
    updatedAt: string;
}

interface RepaymentPaginatedData {
    items: IRepayment[];
    meta: PaginationMeta;
}
