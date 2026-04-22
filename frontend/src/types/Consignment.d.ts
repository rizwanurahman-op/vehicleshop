type SaleType = "park_sale" | "finance_sale";
type ConsignmentStatus = "received" | "reconditioning" | "ready_for_sale" | "sold" | "sold_pending" | "returned";
type SettlementStatus = "open" | "buyer_settled" | "payee_settled" | "fully_closed";
type PayeePaymentStatus = "not_started" | "partial" | "paid" | "closed";
type BuyerPaymentStatus = "pending" | "partial" | "paid";
type ConsignmentSourceType = "friend" | "customer" | "agent" | "owner" | "other";
type ConsignmentCostCategory = "workshop" | "spareParts" | "painting" | "washing" | "fuel" | "paperwork" | "commission" | "other";
type BuyerPaymentMode = "Cash" | "Online" | "Cheque" | "UPI" | "GPay" | "Finance" | "Bank Transfer";
type PayeePaymentMode = "Cash" | "Online" | "Cheque" | "UPI" | "Bank Transfer";

interface IConsignmentCostItem {
    _id: string;
    name: string;
    amount: number;
    date?: string;
    notes?: string;
}

interface IConsignmentCostBreakdown {
    category: ConsignmentCostCategory;
    items: IConsignmentCostItem[];
}

interface IBuyerPayment {
    _id: string;
    date: string;
    amount: number;
    mode: BuyerPaymentMode;
    type: "cash" | "exchange";
    exchangeDetails?: string;
    exchangeVehicleMake?: string;
    exchangeVehicleRegNo?: string;
    exchangeCreatedRef?: string;
    exchangeCreatedIn?: "vehicles" | "consignmentVehicles";
    referenceNo?: string;
    notes?: string;
}

interface IPayeePayment {
    _id: string;
    date: string;
    amount: number;
    mode: PayeePaymentMode;
    notes?: string;
}

interface IConsignmentVehicle {
    _id: string;
    consignmentId: string;
    saleType: SaleType;
    vehicleType: VehicleType;

    make: string;
    model: string;
    year: number | null;
    registrationNo: string;
    color?: string;
    engineNo?: string;
    chassisNo?: string;

    previousOwner: string;
    previousOwnerPhone?: string;
    sourceType: ConsignmentSourceType;
    sourceNotes?: string;
    dateReceived: string;

    // Park Sale fields
    ownerId?: string;
    expectedPrice?: number;
    commissionType?: "fixed" | "percentage" | "negotiable";
    commissionValue?: number;
    agreedDuration?: number;
    agreementNotes?: string;

    // Finance Sale fields
    financeCompany?: string;

    purchasePrice: number;

    workshopRepairCost: number;
    sparePartsAccessories: number;
    paintingPolishingCost: number;
    washingDetailingCost: number;
    fuelCost: number;
    paperworkTaxInsurance: number;
    commission: number;
    otherExpenses: number;
    costBreakdowns: IConsignmentCostBreakdown[];
    totalReconCost: number;
    totalInvestment: number;

    status: ConsignmentStatus;

    dateSold?: string;
    soldPrice?: number;
    soldTo?: string;
    soldToPhone?: string;

    isExchange: boolean;         // This consignment was SOLD via exchange payment
    isFromExchange: boolean;     // This consignment ENTERED inventory via exchange
    exchangeSourceRef?: string;
    exchangeSourceCollection?: "vehicles" | "consignmentVehicles";
    exchangeDetails?: string;    // Human-readable summary of the exchange origin

    buyerPayments: IBuyerPayment[];
    receivedAmount: number;
    buyerBalance: number;
    buyerPaymentStatus: BuyerPaymentStatus;

    payeePayments: IPayeePayment[];
    paidToPayee: number;
    payeeBalance: number;
    payeePaymentStatus: PayeePaymentStatus;

    grossMargin: number;
    netProfit: number;
    profitLossPercentage: number;
    daysInShop: number | null;

    settlementStatus: SettlementStatus;

    documents: IVehicleDocument[];
    activityLog: IActivityLogEntry[];
    remarks?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface IVehicleOwner {
    _id: string;
    ownerId: string;
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface IVehicleOwnerWithSummary extends IVehicleOwner {
    totalVehiclesParked: number;
    totalVehiclesSold: number;
    currentlyParked: number;
    totalPaid: number;
    totalPending: number;
    vehicles: IConsignmentVehicle[];
}

interface IConsignmentDashboardStats {
    totalVehicles: number;
    currentlyInShop: number;
    sold: number;
    returned: number;
    totalInvested: number;
    totalRevenue: number;
    totalNetProfit: number;
    avgMargin: number;
    pendingBuyerPayments: { count: number; amount: number };
    pendingPayeePayments: { count: number; amount: number };
    parkSale: { total: number; inShop: number; sold: number };
    financeSale: { total: number; inShop: number; sold: number };
}

type ConsignmentPaginatedData = {
    data: IConsignmentVehicle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

type VehicleOwnerPaginatedData = {
    data: IVehicleOwner[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};
