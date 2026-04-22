type VehicleType = "two_wheeler" | "four_wheeler";
type VehicleStatus = "in_stock" | "reconditioning" | "ready_for_sale" | "sold" | "sold_pending" | "exchanged";
type SaleStatus = "fully_received" | "balance_pending" | "noc_pending" | "noc_cash_pending" | null;
type NOCStatus = "not_applicable" | "pending" | "received" | "submitted" | "completed";
type VehiclePaymentMode = "Cash" | "Online" | "Cheque" | "UPI" | "GPay" | "Finance" | "Bank Transfer";
type CostCategory = "travel" | "workshop" | "spareParts" | "alignment" | "painting" | "washing" | "fuel" | "paperwork" | "commission" | "other";
type FundingSource = "own" | "investor" | "mixed";
type PurchasePaymentStatus = "paid" | "partial" | "pending";
type DocumentType = "rc_book" | "insurance" | "noc" | "invoice" | "photo" | "other";

interface ICostItem {
    _id: string;
    name: string;
    amount: number;
    date?: string;
    notes?: string;
}

interface ICostBreakdown {
    category: CostCategory;
    items: ICostItem[];
}

interface IVehiclePayment {
    _id: string;
    date: string;
    amount: number;
    mode: VehiclePaymentMode;
    type?: "cash" | "exchange";
    bankAccount?: string;
    source?: string;
    exchangeDetails?: string;
    exchangeVehicleMake?: string;
    exchangeVehicleRegNo?: string;
    exchangeCreatedRef?: string;
    exchangeCreatedIn?: "vehicles" | "consignmentVehicles";
    referenceNo?: string;
    notes?: string;
}

interface IFundingDetail {
    source: "own" | string;
    lenderName?: string;
    amount: number;
    linkedInvestmentId?: string;
    remarks?: string;
}

interface IVehicleDocument {
    _id: string;
    type: DocumentType;
    name: string;
    url: string;
    uploadedAt: string;
}

interface IActivityLogEntry {
    action: string;
    description: string;
    amount?: number;
    date: string;
    user?: string;
}

interface IVehicle {
    _id: string;
    vehicleId: string;
    vehicleType: VehicleType;
    make: string;
    model: string;
    year: number | null;
    registrationNo: string;
    color?: string;
    engineNo?: string;
    chassisNo?: string;
    purchasedFrom: string;
    purchasedFromPhone?: string;
    datePurchased: string;
    purchasePrice: number;
    fundingSource: FundingSource;
    fundingDetails: IFundingDetail[];
    travelCost: number;
    workshopRepairCost: number;
    sparePartsAccessories: number;
    alignmentWork: number;
    paintingPolishingCost: number;
    washingDetailingCost: number;
    fuelCost: number;
    paperworkTaxInsurance: number;
    commission: number;
    otherExpenses: number;
    costBreakdowns: ICostBreakdown[];
    purchasePayments: IVehiclePayment[];
    purchasePaymentStatus: PurchasePaymentStatus;
    purchasePendingAmount: number;
    totalInvestment: number;
    status: VehicleStatus;
    dateSold?: string;
    soldPrice?: number;
    soldTo?: string;
    soldToPhone?: string;
    saleStatus: SaleStatus;
    isExchange: boolean;
    isFromExchange: boolean;
    exchangeVehicleRef?: string;
    exchangeSourceRef?: string;
    exchangeSourceCollection?: "vehicles" | "consignmentVehicles";
    exchangeDetails?: string;
    nocStatus: NOCStatus;
    salePayments: IVehiclePayment[];
    receivedAmount: number;
    balanceAmount: number;
    profitLoss: number;
    profitLossPercentage: number;
    daysToSell: number | null;
    documents: IVehicleDocument[];
    activityLog: IActivityLogEntry[];
    remarks?: string;
    notes?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface IVehicleTypeStats {
    total: number;
    inStock: number;
    sold: number;
    soldPending: number;
    exchanged: number;
    totalInvested: number;
    totalRevenue: number;
    totalReceived: number;
    totalBalancePending: number;
    netProfit: number;
    avgMargin?: number;
}

interface IVehicleDashboardStats {
    twoWheelers: IVehicleTypeStats;
    fourWheelers: IVehicleTypeStats;
    combined: IVehicleTypeStats & { avgMargin: number };
    pendingItems: {
        balancePending: { count: number; totalAmount: number; vehicles: IVehicleSummary[] };
        nocPending: { count: number; vehicles: IVehicleSummary[] };
        purchasePaymentsDue: { count: number; totalAmount: number; vehicles: IVehicleSummary[] };
    };
    fundingBreakdown: { ownMoney: number; investorMoney: number };
    recentActivity: IVehicle[];
}

interface IVehicleSummary {
    _id: string;
    vehicleId: string;
    vehicleType: VehicleType;
    make: string;
    model: string;
    registrationNo: string;
    amount?: number;
}

type VehiclePaginatedData = {
    data: IVehicle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};
