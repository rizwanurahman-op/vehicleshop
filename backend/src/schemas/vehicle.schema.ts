import { z } from "zod";

export const createVehicleSchema = z.object({
    vehicleType: z.enum(["two_wheeler", "four_wheeler"]),
    make: z.string().min(1, { message: "Make is required" }),
    model: z.string().min(1, { message: "Model is required" }),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1).nullable().optional(),
    registrationNo: z.string().min(1, { message: "Registration number is required" }),
    color: z.string().optional(),
    engineNo: z.string().optional(),
    chassisNo: z.string().optional(),
    purchasedFrom: z.string().min(1, { message: "Seller name is required" }),
    purchasedFromPhone: z.string().optional(),
    datePurchased: z.string().min(1, { message: "Date purchased is required" }),
    purchasePrice: z.number().min(0, { message: "Purchase price must be ≥ 0" }),
    fundingSource: z.enum(["own", "investor", "mixed"]).default("own"),
    fundingDetails: z.array(z.object({
        source: z.string(),
        lenderName: z.string().optional(),
        amount: z.number().min(0),
        linkedInvestmentId: z.string().optional(),
        remarks: z.string().optional(),
    })).optional(),
    travelCost: z.number().min(0).default(0),
    workshopRepairCost: z.number().min(0).default(0),
    sparePartsAccessories: z.number().min(0).default(0),
    alignmentWork: z.number().min(0).default(0),
    paintingPolishingCost: z.number().min(0).default(0),
    washingDetailingCost: z.number().min(0).default(0),
    fuelCost: z.number().min(0).default(0),
    paperworkTaxInsurance: z.number().min(0).default(0),
    commission: z.number().min(0).default(0),
    otherExpenses: z.number().min(0).default(0),
    nocStatus: z.enum(["not_applicable", "pending", "received", "submitted", "completed"]).optional(),
    remarks: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(["in_stock", "reconditioning", "ready_for_sale", "sold", "sold_pending", "exchanged"]).optional(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const recordSaleSchema = z.object({
    dateSold: z.string().min(1, { message: "Sale date is required" }),
    soldPrice: z.number().min(0, { message: "Sold price must be ≥ 0" }),
    soldTo: z.string().min(1, { message: "Buyer name is required" }),
    soldToPhone: z.string().optional(),
    nocStatus: z.enum(["not_applicable", "pending", "received", "submitted", "completed"]).optional(),
    remarks: z.string().optional(),
});

export const updateSaleSchema = recordSaleSchema.partial();

export const addPurchasePaymentSchema = z.object({
    date: z.string().min(1),
    amount: z.number().min(1, { message: "Amount must be > 0" }),
    mode: z.enum(["Cash", "Online", "Cheque", "UPI", "Bank Transfer"]),
    bankAccount: z.string().optional(),
    notes: z.string().optional(),
});

export const updatePurchasePaymentSchema = addPurchasePaymentSchema.partial();

export const addSalePaymentSchema = z.object({
    date: z.string().min(1),
    amount: z.number().min(1, { message: "Amount must be > 0" }),
    mode: z.enum(["Cash", "Online", "Cheque", "UPI", "GPay", "Finance", "Bank Transfer"]),
    type: z.enum(["cash", "exchange"]).default("cash"),
    source: z.string().optional(),
    exchangeDetails: z.string().optional(),
    exchangeVehicleMake: z.string().optional(),
    exchangeVehicleRegNo: z.string().optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    createExchangeAs: z.enum(["phase2_purchase", "phase3_park_sale", "phase3_finance_sale", "skip"]).optional().default("skip"),
    exchangeVehicleType: z.enum(["two_wheeler", "four_wheeler"]).optional(),
});

export const updateSalePaymentSchema = addSalePaymentSchema.partial();

export const updateCostsSchema = z.object({
    travelCost: z.number().min(0).optional(),
    workshopRepairCost: z.number().min(0).optional(),
    sparePartsAccessories: z.number().min(0).optional(),
    alignmentWork: z.number().min(0).optional(),
    paintingPolishingCost: z.number().min(0).optional(),
    washingDetailingCost: z.number().min(0).optional(),
    fuelCost: z.number().min(0).optional(),
    paperworkTaxInsurance: z.number().min(0).optional(),
    commission: z.number().min(0).optional(),
    otherExpenses: z.number().min(0).optional(),
});

export const addCostBreakdownItemSchema = z.object({
    category: z.enum(["travel", "workshop", "spareParts", "alignment", "painting", "washing", "fuel", "paperwork", "commission", "other"]),
    name: z.string().min(1, { message: "Item name is required" }),
    amount: z.number().min(0),
    date: z.string().optional(),
    notes: z.string().optional(),
});

export const updateCostBreakdownItemSchema = z.object({
    name: z.string().optional(),
    amount: z.number().min(0).optional(),
    date: z.string().optional(),
    notes: z.string().optional(),
});
