import { z } from "zod";

export const createConsignmentSchema = z.object({
    saleType: z.enum(["park_sale", "finance_sale"]),
    vehicleType: z.enum(["two_wheeler", "four_wheeler"]),
    make: z.string().min(1, { message: "Make is required" }),
    model: z.string().min(1, { message: "Model is required" }),
    year: z.number().int().min(1950).max(new Date().getFullYear() + 1).nullable().optional(),
    registrationNo: z.string().min(1, { message: "Registration number is required" }),
    color: z.string().optional(),
    engineNo: z.string().optional(),
    chassisNo: z.string().optional(),
    previousOwner: z.string().min(1, { message: "Owner name is required" }),
    previousOwnerPhone: z.string().optional(),
    sourceType: z.enum(["friend", "customer", "agent", "owner", "other"]).default("owner"),
    sourceNotes: z.string().optional(),
    dateReceived: z.string().min(1, { message: "Date received is required" }),

    // Park Sale fields
    ownerId: z.string().optional(),
    expectedPrice: z.number().min(0).optional(),
    commissionType: z.enum(["fixed", "percentage", "negotiable"]).optional(),
    commissionValue: z.number().min(0).optional(),
    agreedDuration: z.number().int().min(0).optional(),
    agreementNotes: z.string().optional(),

    // Finance Sale fields
    financeCompany: z.string().optional(),

    purchasePrice: z.number().min(0).default(0),

    // Reconditioning costs
    workshopRepairCost: z.number().min(0).default(0),
    sparePartsAccessories: z.number().min(0).default(0),
    paintingPolishingCost: z.number().min(0).default(0),
    washingDetailingCost: z.number().min(0).default(0),
    fuelCost: z.number().min(0).default(0),
    paperworkTaxInsurance: z.number().min(0).default(0),
    commission: z.number().min(0).default(0),
    otherExpenses: z.number().min(0).default(0),

    remarks: z.string().optional(),
    notes: z.string().optional(),
});

export const updateConsignmentSchema = createConsignmentSchema.partial();

export const updateConsignmentStatusSchema = z.object({
    status: z.enum(["received", "reconditioning", "ready_for_sale", "returned"]),
    notes: z.string().optional(),
});

export const updateConsignmentCostsSchema = z.object({
    workshopRepairCost: z.number().min(0).optional(),
    sparePartsAccessories: z.number().min(0).optional(),
    paintingPolishingCost: z.number().min(0).optional(),
    washingDetailingCost: z.number().min(0).optional(),
    fuelCost: z.number().min(0).optional(),
    paperworkTaxInsurance: z.number().min(0).optional(),
    commission: z.number().min(0).optional(),
    otherExpenses: z.number().min(0).optional(),
});

export const addCostBreakdownItemSchema = z.object({
    category: z.enum(["workshop", "spareParts", "painting", "washing", "fuel", "paperwork", "commission", "other"]),
    name: z.string().min(1, { message: "Item name is required" }),
    amount: z.number().min(0),
    date: z.string().optional(),
    notes: z.string().optional(),
});

export const recordConsignmentSaleSchema = z.object({
    dateSold: z.string().min(1, { message: "Sale date is required" }),
    soldPrice: z.number().min(0, { message: "Sold price must be ≥ 0" }),
    soldTo: z.string().min(1, { message: "Buyer name is required" }),
    soldToPhone: z.string().optional(),
    remarks: z.string().optional(),
});

export const addBuyerPaymentSchema = z.object({
    date: z.string().min(1),
    amount: z.number().min(1, { message: "Amount must be > 0" }),
    mode: z.enum(["Cash", "Online", "Cheque", "UPI", "GPay", "Finance", "Bank Transfer"]),
    type: z.enum(["cash", "exchange"]).default("cash"),
    exchangeDetails: z.string().optional(),
    exchangeVehicleMake: z.string().optional(),
    exchangeVehicleRegNo: z.string().optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
    createExchangeAs: z.enum(["phase2_purchase", "phase3_park_sale", "phase3_finance_sale", "skip"]).optional().default("skip"),
    exchangeVehicleType: z.enum(["two_wheeler", "four_wheeler"]).optional(),
});

export const addPayeePaymentSchema = z.object({
    date: z.string().min(1),
    amount: z.number().min(1, { message: "Amount must be > 0" }),
    mode: z.enum(["Cash", "Online", "Cheque", "UPI", "Bank Transfer"]),
    notes: z.string().optional(),
    markClosed: z.boolean().optional().default(false),
});

export const createVehicleOwnerSchema = z.object({
    name: z.string().min(1, { message: "Name is required" }),
    phone: z.string().optional(),
    address: z.string().optional(),
    remarks: z.string().optional(),
});

export const updateVehicleOwnerSchema = createVehicleOwnerSchema.partial();
