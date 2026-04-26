interface UnifiedSaleRecord {
    _id: string;
    source: "vehicle" | "consignment";
    refId: string;
    saleType?: string;
    vehicleType: VehicleType;
    make: string;
    model: string;
    registrationNo: string;
    dateSold: string | null;
    soldTo: string;
    soldToPhone?: string;
    soldPrice: number;
    totalInvestment: number;
    receivedAmount: number;
    balanceAmount: number;
    profitLoss: number;
    profitLossPercentage: number;
    saleStatus: string;
    nocStatus?: string;
    isExchange: boolean;
    isFromExchange: boolean;
    daysToSell: number | null;
}

interface SalesStats {
    totalSales: number;
    totalRevenue: number;
    totalReceived: number;
    totalBalance: number;
    totalProfit: number;
    pendingCount: number;
    exchangeCount: number;
    vehicleSales: number;
    consignmentSales: number;
}

interface SalesPaginatedData {
    data: UnifiedSaleRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: SalesStats;
}
