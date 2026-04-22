import mongoose, { Schema, Document, model } from "mongoose";

export interface IConsignmentVehicle extends Document {
    consignmentId: string;
    saleType: "park_sale" | "finance_sale";
    vehicleType: "two_wheeler" | "four_wheeler";

    // Vehicle Identity
    make: string;
    model: string;
    year: number | null;
    registrationNo: string;
    color?: string;
    engineNo?: string;
    chassisNo?: string;

    // Source Details
    previousOwner: string;
    previousOwnerPhone?: string;
    sourceType: "friend" | "customer" | "agent" | "owner" | "other";
    sourceNotes?: string;
    dateReceived: Date;

    // Park Sale Only: Owner Agreement
    ownerId?: mongoose.Types.ObjectId;    // ref to VehicleOwner
    expectedPrice?: number;
    commissionType?: "fixed" | "percentage" | "negotiable";
    commissionValue?: number;
    agreedDuration?: number;
    agreementNotes?: string;

    // Finance Sale Only
    financeCompany?: string;

    // Purchase Price (optional for both)
    purchasePrice: number;

    // Reconditioning Costs (SHARED — 8 categories)
    workshopRepairCost: number;
    sparePartsAccessories: number;
    paintingPolishingCost: number;
    washingDetailingCost: number;
    fuelCost: number;
    paperworkTaxInsurance: number;
    commission: number;
    otherExpenses: number;

    // Itemized Cost Breakdowns (SHARED)
    costBreakdowns: Array<{
        category: "workshop" | "spareParts" | "painting" | "washing" | "fuel" | "paperwork" | "commission" | "other";
        items: Array<{
            _id: mongoose.Types.ObjectId;
            name: string;
            amount: number;
            date?: Date;
            notes?: string;
        }>;
    }>;

    // Auto-Computed Totals
    totalReconCost: number;
    totalInvestment: number;

    // Vehicle Status
    status: "received" | "reconditioning" | "ready_for_sale" | "sold" | "sold_pending" | "returned";

    // Sale Details
    dateSold?: Date;
    soldPrice?: number;
    soldTo?: string;
    soldToPhone?: string;

    // Exchange Vehicle Tracking
    isExchange: boolean;          // This consignment was SOLD via exchange payment
    isFromExchange: boolean;      // This consignment ENTERED inventory via exchange
    exchangeSourceRef?: mongoose.Types.ObjectId;
    exchangeSourceCollection?: "vehicles" | "consignmentVehicles";
    exchangeDetails?: string;     // Human-readable origin summary (e.g. "Exchange from Hero Splender...")

    // Buyer Payment Tracking — Money IN
    buyerPayments: Array<{
        _id: mongoose.Types.ObjectId;
        date: Date;
        amount: number;
        mode: "Cash" | "Online" | "Cheque" | "UPI" | "GPay" | "Finance" | "Bank Transfer";
        type: "cash" | "exchange";
        exchangeDetails?: string;
        exchangeVehicleMake?: string;
        exchangeVehicleRegNo?: string;
        exchangeCreatedRef?: mongoose.Types.ObjectId;
        exchangeCreatedIn?: "vehicles" | "consignmentVehicles";
        referenceNo?: string;
        notes?: string;
    }>;
    receivedAmount: number;
    buyerBalance: number;
    buyerPaymentStatus: "pending" | "partial" | "paid";

    // Payee Payment Tracking — Money OUT (owner or finance)
    payeePayments: Array<{
        _id: mongoose.Types.ObjectId;
        date: Date;
        amount: number;
        mode: "Cash" | "Online" | "Cheque" | "UPI" | "Bank Transfer";
        notes?: string;
    }>;
    paidToPayee: number;
    payeeBalance: number;
    payeePaymentStatus: "not_started" | "partial" | "paid" | "closed";

    // Profit / Loss
    grossMargin: number;
    netProfit: number;
    profitLossPercentage: number;
    daysInShop: number | null;

    // Settlement Status
    settlementStatus: "open" | "buyer_settled" | "payee_settled" | "fully_closed";

    // Documents
    documents: Array<{
        _id: mongoose.Types.ObjectId;
        type: "rc_book" | "insurance" | "owner_agreement" | "photo" | "invoice" | "other";
        name: string;
        url: string;
        uploadedAt: Date;
    }>;

    // Activity Log
    activityLog: Array<{
        action: string;
        description: string;
        amount?: number;
        date: Date;
        user?: string;
    }>;

    remarks?: string;
    notes?: string;
    isActive: boolean;
}

const CostItemSchema = new Schema(
    { name: { type: String, required: true }, amount: { type: Number, required: true }, date: Date, notes: String },
    { _id: true }
);

const CostBreakdownSchema = new Schema({
    category: {
        type: String,
        enum: ["workshop", "spareParts", "painting", "washing", "fuel", "paperwork", "commission", "other"],
        required: true,
    },
    items: [CostItemSchema],
});

const BuyerPaymentSchema = new Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["Cash", "Online", "Cheque", "UPI", "GPay", "Finance", "Bank Transfer"], required: true },
    type: { type: String, enum: ["cash", "exchange"], default: "cash" },
    exchangeDetails: String,
    exchangeVehicleMake: String,
    exchangeVehicleRegNo: String,
    exchangeCreatedRef: { type: Schema.Types.ObjectId },
    exchangeCreatedIn: { type: String, enum: ["vehicles", "consignmentVehicles"] },
    referenceNo: String,
    notes: String,
}, { _id: true });

const PayeePaymentSchema = new Schema({
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, enum: ["Cash", "Online", "Cheque", "UPI", "Bank Transfer"], required: true },
    notes: String,
}, { _id: true });

const DocumentSchema = new Schema({
    type: { type: String, enum: ["rc_book", "insurance", "owner_agreement", "photo", "invoice", "other"], required: true },
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

const ConsignmentVehicleSchema = new Schema<IConsignmentVehicle>({
    consignmentId: { type: String, unique: true, index: true },
    saleType: { type: String, enum: ["park_sale", "finance_sale"], required: true, index: true },
    vehicleType: { type: String, enum: ["two_wheeler", "four_wheeler"], required: true },

    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, default: null },
    registrationNo: { type: String, required: true, trim: true, uppercase: true },
    color: String,
    engineNo: String,
    chassisNo: String,

    previousOwner: { type: String, required: true, trim: true },
    previousOwnerPhone: String,
    sourceType: { type: String, enum: ["friend", "customer", "agent", "owner", "other"], default: "owner" },
    sourceNotes: String,
    dateReceived: { type: Date, required: true },

    // Park Sale
    ownerId: { type: Schema.Types.ObjectId, ref: "VehicleOwner" },
    expectedPrice: Number,
    commissionType: { type: String, enum: ["fixed", "percentage", "negotiable"] },
    commissionValue: Number,
    agreedDuration: Number,
    agreementNotes: String,

    // Finance Sale
    financeCompany: String,

    purchasePrice: { type: Number, default: 0 },

    workshopRepairCost: { type: Number, default: 0 },
    sparePartsAccessories: { type: Number, default: 0 },
    paintingPolishingCost: { type: Number, default: 0 },
    washingDetailingCost: { type: Number, default: 0 },
    fuelCost: { type: Number, default: 0 },
    paperworkTaxInsurance: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    otherExpenses: { type: Number, default: 0 },

    costBreakdowns: { type: [CostBreakdownSchema], default: [] },

    totalReconCost: { type: Number, default: 0 },
    totalInvestment: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ["received", "reconditioning", "ready_for_sale", "sold", "sold_pending", "returned"],
        default: "received",
        index: true,
    },

    dateSold: Date,
    soldPrice: Number,
    soldTo: String,
    soldToPhone: String,

    isExchange: { type: Boolean, default: false },
    isFromExchange: { type: Boolean, default: false },
    exchangeSourceRef: { type: Schema.Types.ObjectId },
    exchangeSourceCollection: { type: String, enum: ["vehicles", "consignmentVehicles"] },
    exchangeDetails: { type: String },

    buyerPayments: { type: [BuyerPaymentSchema], default: [] },
    receivedAmount: { type: Number, default: 0 },
    buyerBalance: { type: Number, default: 0 },
    buyerPaymentStatus: { type: String, enum: ["pending", "partial", "paid"], default: "pending" },

    payeePayments: { type: [PayeePaymentSchema], default: [] },
    paidToPayee: { type: Number, default: 0 },
    payeeBalance: { type: Number, default: 0 },
    payeePaymentStatus: { type: String, enum: ["not_started", "partial", "paid", "closed"], default: "not_started" },

    grossMargin: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
    profitLossPercentage: { type: Number, default: 0 },
    daysInShop: { type: Number, default: null },

    settlementStatus: { type: String, enum: ["open", "buyer_settled", "payee_settled", "fully_closed"], default: "open" },

    documents: { type: [DocumentSchema], default: [] },
    activityLog: { type: [ActivityLogSchema], default: [] },

    remarks: String,
    notes: String,
    isActive: { type: Boolean, default: true, index: true },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────
ConsignmentVehicleSchema.index({ vehicleType: 1 });
ConsignmentVehicleSchema.index({ status: 1 });
ConsignmentVehicleSchema.index({ settlementStatus: 1 });
ConsignmentVehicleSchema.index({ dateReceived: -1 });
ConsignmentVehicleSchema.index({ dateSold: -1 });
ConsignmentVehicleSchema.index({ buyerPaymentStatus: 1 });
ConsignmentVehicleSchema.index({ payeePaymentStatus: 1 });
ConsignmentVehicleSchema.index({ saleType: 1, status: 1 });
ConsignmentVehicleSchema.index({ previousOwner: "text", make: "text", model: "text", soldTo: "text", registrationNo: "text" });

// ── Pre-save hook: auto-calculations ─────────────────────────────
ConsignmentVehicleSchema.pre("save", function (next) {
    // 1. Total Reconditioning Cost
    this.totalReconCost = (this.workshopRepairCost || 0)
        + (this.sparePartsAccessories || 0)
        + (this.paintingPolishingCost || 0)
        + (this.washingDetailingCost || 0)
        + (this.fuelCost || 0)
        + (this.paperworkTaxInsurance || 0)
        + (this.commission || 0)
        + (this.otherExpenses || 0);

    // 2. Total Investment
    this.totalInvestment = (this.purchasePrice || 0) + this.totalReconCost;

    // 3a. Exchange flag — set if any buyer payment is of type exchange
    this.isExchange = this.buyerPayments.some(p => p.type === "exchange");

    // 3b. Buyer Payment Status
    this.receivedAmount = this.buyerPayments.reduce((s, p) => s + p.amount, 0);
    this.buyerBalance = Math.max(0, (this.soldPrice || 0) - this.receivedAmount);
    if (this.buyerBalance <= 0 && this.buyerPayments.length > 0) {
        this.buyerPaymentStatus = "paid";
    } else if (this.buyerPayments.length > 0) {
        this.buyerPaymentStatus = "partial";
    } else {
        this.buyerPaymentStatus = "pending";
    }

    // 4. Payee Payment Status
    this.paidToPayee = this.payeePayments.reduce((s, p) => s + p.amount, 0);
    this.payeeBalance = Math.max(0, (this.soldPrice || 0) - this.totalReconCost - this.paidToPayee);
    if (this.payeePaymentStatus !== "closed") {
        if (this.payeePayments.length === 0) {
            this.payeePaymentStatus = "not_started";
        } else if (this.payeeBalance <= 0) {
            this.payeePaymentStatus = "paid";
        } else {
            this.payeePaymentStatus = "partial";
        }
    }

    // 5. Profit / Loss
    const today = new Date();
    if (this.dateSold && this.soldPrice) {
        this.grossMargin = (this.soldPrice || 0) - this.paidToPayee;
        this.netProfit = this.grossMargin - this.totalReconCost;
        const diff = new Date(this.dateSold).getTime() - new Date(this.dateReceived).getTime();
        this.daysInShop = Math.floor(diff / (1000 * 60 * 60 * 24));
        // update status to sold if sold
        if (this.buyerBalance <= 0) {
            this.status = "sold";
        } else {
            this.status = "sold_pending";
        }
    } else {
        this.grossMargin = 0;
        this.netProfit = -this.totalInvestment;
        const diff = today.getTime() - new Date(this.dateReceived).getTime();
        this.daysInShop = Math.floor(diff / (1000 * 60 * 60 * 24));
    }
    this.profitLossPercentage = this.totalInvestment > 0
        ? parseFloat(((this.netProfit / this.totalInvestment) * 100).toFixed(2))
        : 0;

    // 6. Settlement Status
    if (this.dateSold) {
        const buyerDone = this.buyerPaymentStatus === "paid";
        const payeeDone = this.payeePaymentStatus === "closed";
        if (buyerDone && payeeDone) {
            this.settlementStatus = "fully_closed";
        } else if (buyerDone) {
            this.settlementStatus = "buyer_settled";
        } else if (payeeDone) {
            this.settlementStatus = "payee_settled";
        } else {
            this.settlementStatus = "open";
        }
    } else {
        this.settlementStatus = "open";
    }

    next();
});

export const ConsignmentVehicle = model<IConsignmentVehicle>("ConsignmentVehicle", ConsignmentVehicleSchema);
