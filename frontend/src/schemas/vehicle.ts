import { z } from "zod";

export const createVehicleSchema = z.object({
    vehicleType: z.enum(["two_wheeler", "four_wheeler"]),
    make: z.string().min(1, "Make is required"),
    model: z.string().min(1, "Model is required"),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1).nullable().optional(),
    registrationNo: z.string().min(1, "Registration number is required"),
    color: z.string().optional(),
    engineNo: z.string().optional(),
    chassisNo: z.string().optional(),
    purchasedFrom: z.string().min(1, "Seller name is required"),
    purchasedFromPhone: z.string().optional(),
    datePurchased: z.string().min(1, "Purchase date is required"),
    purchasePrice: z.number().min(0, "Purchase price is required"),
    fundingSource: z.enum(["own", "investor", "mixed"]).default("own"),
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
});

export const recordSaleSchema = z.object({
    dateSold: z.string().min(1, "Sale date is required"),
    soldPrice: z.number().min(0, "Sold price is required"),
    soldTo: z.string().min(1, "Buyer name is required"),
    soldToPhone: z.string().optional(),
    nocStatus: z.enum(["not_applicable", "pending", "received", "submitted", "completed"]).optional(),
    remarks: z.string().optional(),
});

export const addPurchasePaymentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    amount: z.number().min(1, "Amount must be > 0"),
    mode: z.enum(["Cash", "Online", "Cheque", "UPI", "Bank Transfer"]),
    bankAccount: z.string().optional(),
    notes: z.string().optional(),
});

export const addSalePaymentSchema = z.object({
    date: z.string().min(1, "Date is required"),
    amount: z.number().min(1, "Amount must be > 0"),
    mode: z.enum(["Cash", "Online", "Cheque", "UPI", "GPay", "Finance", "Bank Transfer"]),
    type: z.enum(["cash", "exchange"]).default("cash"),
    source: z.string().optional(),
    exchangeDetails: z.string().optional(),
    exchangeVehicleMake: z.string().optional(),
    exchangeVehicleRegNo: z.string().optional(),
    exchangeVehicleType: z.enum(["two_wheeler", "four_wheeler"]).optional(),
    createExchangeAs: z.enum(["phase2_purchase", "phase3_park_sale", "phase3_finance_sale", "skip"]).optional().default("phase2_purchase"),
    addToInventory: z.boolean().optional().default(true),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
});

export const addCostBreakdownItemSchema = z.object({
    category: z.enum(["travel", "workshop", "spareParts", "alignment", "painting", "washing", "fuel", "paperwork", "commission", "other"]),
    name: z.string().min(1, "Item name is required"),
    amount: z.number().min(0),
    date: z.string().optional(),
    notes: z.string().optional(),
});
