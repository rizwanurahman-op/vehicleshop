import mongoose, { Schema, Document, model } from "mongoose";

export interface IVehicle extends Omit<Document, 'model'> {
    vehicleId: string;
    vehicleType: "two_wheeler" | "four_wheeler";
    make: string;
    model: string;
    year: number | null;
    registrationNo: string;
    color?: string;
    engineNo?: string;
    chassisNo?: string;
    purchasedFrom: string;
    purchasedFromPhone?: string;
    datePurchased: Date;
    purchasePrice: number;
    fundingSource: "own" | "investor" | "mixed";
    fundingDetails: Array<{
        source: "own" | string;
        lenderName?: string;
        amount: number;
        linkedInvestmentId?: mongoose.Types.ObjectId;
        remarks?: string;
    }>;
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
    costBreakdowns: Array<{
        category: "travel" | "workshop" | "spareParts" | "alignment" | "painting" | "washing" | "fuel" | "paperwork" | "commission" | "other";
        items: Array<{ _id: mongoose.Types.ObjectId; name: string; amount: number; date?: Date; notes?: string }>;
    }>;
    purchasePayments: Array<{
        _id: mongoose.Types.ObjectId;
        date: Date;
        amount: number;
        mode: "Cash" | "Online" | "Cheque" | "UPI" | "Bank Transfer";
        bankAccount?: string;
        notes?: string;
    }>;
    purchasePaymentStatus: "paid" | "partial" | "pending";
    purchasePendingAmount: number;
    totalInvestment: number;
    status: "in_stock" | "reconditioning" | "ready_for_sale" | "sold" | "sold_pending" | "exchanged";
    dateSold?: Date;
    soldPrice?: number;
    soldTo?: string;
    soldToPhone?: string;
    saleStatus: "fully_received" | "balance_pending" | "noc_pending" | "noc_cash_pending" | null;
    isExchange: boolean;
    isFromExchange: boolean;
    exchangeVehicleRef?: mongoose.Types.ObjectId;
    exchangeSourceRef?: mongoose.Types.ObjectId;
    exchangeSourceCollection?: "vehicles" | "consignmentVehicles";
    exchangeDetails?: string;
    nocStatus: "not_applicable" | "pending" | "received" | "submitted" | "completed";
    salePayments: Array<{
        _id: mongoose.Types.ObjectId;
        date: Date;
        amount: number;
        mode: "Cash" | "Online" | "Cheque" | "UPI" | "GPay" | "Finance" | "Bank Transfer";
        type: "cash" | "exchange";
        source?: string;
        exchangeDetails?: string;
        exchangeVehicleMake?: string;
        exchangeVehicleRegNo?: string;
        exchangeCreatedRef?: mongoose.Types.ObjectId;
        exchangeCreatedIn?: "vehicles" | "consignmentVehicles";
        referenceNo?: string;
        notes?: string;
    }>;
    receivedAmount: number;
    balanceAmount: number;
    profitLoss: number;
    profitLossPercentage: number;
    daysToSell: number | null;
    documents: Array<{ _id: mongoose.Types.ObjectId; type: "rc_book" | "insurance" | "noc" | "invoice" | "photo" | "other"; name: string; url: string; uploadedAt: Date }>;
    activityLog: Array<{ action: string; description: string; amount?: number; date: Date; user?: string }>;
    remarks?: string;
    notes?: string;
    isActive: boolean;
}

const CostItemSchema = new Schema({ name: { type: String, required: true }, amount: { type: Number, required: true }, date: Date, notes: String }, { _id: true });

const CostBreakdownSchema = new Schema({
    category: { type: String, enum: ["travel", "workshop", "spareParts", "alignment", "painting", "washing", "fuel", "paperwork", "commission", "other"], required: true },
    items: [CostItemSchema],
});

const PurchasePaymentSchema = new Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["Cash", "Online", "Cheque", "UPI", "Bank Transfer"], required: true },
    bankAccount: String,
    notes: String,
}, { _id: true });

const SalePaymentSchema = new Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["Cash", "Online", "Cheque", "UPI", "GPay", "Finance", "Bank Transfer"], required: true },
    type: { type: String, enum: ["cash", "exchange"], default: "cash" },
    source: String,
    exchangeDetails: String,
    exchangeVehicleMake: String,
    exchangeVehicleRegNo: String,
    exchangeCreatedRef: { type: Schema.Types.ObjectId },
    exchangeCreatedIn: { type: String, enum: ["vehicles", "consignmentVehicles"] },
    referenceNo: String,
    notes: String,
}, { _id: true });

const FundingDetailSchema = new Schema({
    source: { type: String, required: true },
    lenderName: String,
    amount: { type: Number, required: true, min: 0 },
    linkedInvestmentId: { type: Schema.Types.ObjectId, ref: "Investment" },
    remarks: String,
}, { _id: false });

const DocumentSchema = new Schema({
    type: { type: String, enum: ["rc_book", "insurance", "noc", "invoice", "photo", "other"], required: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const ActivityLogSchema = new Schema({
    action: { type: String, required: true },
    description: { type: String, required: true },
    amount: Number,
    date: { type: Date, default: Date.now },
    user: String,
}, { _id: false });

const VehicleSchema = new Schema<IVehicle>({
    vehicleId: { type: String, unique: true, index: true },
    vehicleType: { type: String, enum: ["two_wheeler", "four_wheeler"], required: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, default: null },
    registrationNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    color: String,
    engineNo: String,
    chassisNo: String,
    purchasedFrom: { type: String, required: true, trim: true },
    purchasedFromPhone: String,
    datePurchased: { type: Date, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    fundingSource: { type: String, enum: ["own", "investor", "mixed"], default: "own" },
    fundingDetails: { type: [FundingDetailSchema], default: [] },
    travelCost: { type: Number, default: 0 },
    workshopRepairCost: { type: Number, default: 0 },
    sparePartsAccessories: { type: Number, default: 0 },
    alignmentWork: { type: Number, default: 0 },
    paintingPolishingCost: { type: Number, default: 0 },
    washingDetailingCost: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 },
    paperworkTaxInsurance: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    otherExpenses: { type: Number, default: 0 },
    costBreakdowns: { type: [CostBreakdownSchema], default: [] },
    purchasePayments: { type: [PurchasePaymentSchema], default: [] },
    purchasePaymentStatus: { type: String, enum: ["paid", "partial", "pending"], default: "pending" },
    purchasePendingAmount: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },
    status: { type: String, enum: ["in_stock", "reconditioning", "ready_for_sale", "sold", "sold_pending", "exchanged"], default: "in_stock", index: true },
    dateSold: Date,
    soldPrice: Number,
    soldTo: String,
    soldToPhone: String,
    saleStatus: { type: String, enum: ["fully_received", "balance_pending", "noc_pending", "noc_cash_pending", null], default: null },
    isExchange: { type: Boolean, default: false },
    isFromExchange: { type: Boolean, default: false },
    exchangeVehicleRef: { type: Schema.Types.ObjectId, ref: "Vehicle" },
    exchangeSourceRef: { type: Schema.Types.ObjectId },
    exchangeSourceCollection: { type: String, enum: ["vehicles", "consignmentVehicles"] },
    exchangeDetails: String,
    nocStatus: { type: String, enum: ["not_applicable", "pending", "received", "submitted", "completed"], default: "not_applicable" },
    salePayments: { type: [SalePaymentSchema], default: [] },
    receivedAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    profitLoss: { type: Number, default: 0 },
    profitLossPercentage: { type: Number, default: 0 },
    daysToSell: { type: Number, default: null },
    documents: { type: [DocumentSchema], default: [] },
    activityLog: { type: [ActivityLogSchema], default: [] },
    remarks: String,
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

// Indexes
VehicleSchema.index({ vehicleType: 1 });
VehicleSchema.index({ saleStatus: 1 });
VehicleSchema.index({ datePurchased: -1 });
VehicleSchema.index({ dateSold: -1 });
VehicleSchema.index({ vehicleType: 1, status: 1 });
VehicleSchema.index({ fundingSource: 1 });
VehicleSchema.index({ nocStatus: 1 });
VehicleSchema.index({ purchasedFrom: "text", soldTo: "text", make: "text", model: "text", registrationNo: "text" });

// Pre-save hook: auto-calculations
VehicleSchema.pre("save", function (next) {
    // 1. Total Investment
    this.totalInvestment = (this.purchasePrice || 0)
        + (this.travelCost || 0)
        + (this.workshopRepairCost || 0)
        + (this.sparePartsAccessories || 0)
        + (this.alignmentWork || 0)
        + (this.paintingPolishingCost || 0)
        + (this.washingDetailingCost || 0)
        + (this.fuelCost || 0)
        + (this.paperworkTaxInsurance || 0)
        + (this.commission || 0)
        + (this.otherExpenses || 0);

    // 2. Purchase Payment Status
    const totalPurchasePaid = this.purchasePayments.reduce((s, p) => s + p.amount, 0);
    this.purchasePendingAmount = Math.max(0, (this.purchasePrice || 0) - totalPurchasePaid);
    if (this.purchasePendingAmount <= 0) this.purchasePaymentStatus = "paid";
    else if (this.purchasePayments.length > 0) this.purchasePaymentStatus = "partial";
    else this.purchasePaymentStatus = "pending";

    // 3. Sale Amounts
    this.receivedAmount = this.salePayments.reduce((s, p) => s + p.amount, 0);
    this.balanceAmount = Math.max(0, (this.soldPrice || 0) - this.receivedAmount);

    // 4. Profit/Loss
    if (this.dateSold && this.soldPrice) {
        this.profitLoss = this.soldPrice - this.totalInvestment;
        const diff = new Date(this.dateSold).getTime() - new Date(this.datePurchased).getTime();
        this.daysToSell = Math.floor(diff / (1000 * 60 * 60 * 24));
    } else {
        this.profitLoss = -this.totalInvestment;
        this.daysToSell = null;
    }
    this.profitLossPercentage = this.totalInvestment > 0
        ? parseFloat(((this.profitLoss / this.totalInvestment) * 100).toFixed(2))
        : 0;

    // 5. Sale Status
    if (this.dateSold && this.soldPrice) {
        const nocPending = this.nocStatus === "pending";
        const balPending = this.balanceAmount > 0;
        if (!nocPending && !balPending) {
            this.saleStatus = "fully_received";
            this.status = "sold";
        } else if (nocPending && balPending) {
            this.saleStatus = "noc_cash_pending";
            this.status = "sold_pending";
        } else if (nocPending) {
            this.saleStatus = "noc_pending";
            this.status = "sold_pending";
        } else {
            this.saleStatus = "balance_pending";
            this.status = "sold_pending";
        }
    }

    // 6. NOC default for 2W
    if (this.isNew && this.vehicleType === "two_wheeler" && this.nocStatus === "not_applicable") {
        this.nocStatus = "not_applicable";
    }

    next();
});

export const Vehicle = model<IVehicle>("Vehicle", VehicleSchema);
