import { Request, Response } from "express";
import * as vs from "../services/vehicle.service";
import {
    createVehicleSchema, updateVehicleSchema,
    recordSaleSchema, updateSaleSchema,
    addPurchasePaymentSchema,
    addSalePaymentSchema,
    updateCostsSchema,
    addCostBreakdownItemSchema,
} from "../schemas/vehicle.schema";

// ── Vehicle CRUD ─────────────────────────────────────────────────
export const createVehicle = async (req: Request, res: Response): Promise<void> => {
    const parsed = createVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.createVehicle(parsed.data as never);
    res.status(201).json({ success: true, statusCode: 201, message: "Vehicle created successfully", data: vehicle });
};

export const getVehicles = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, status, saleStatus, fundingSource, isFromExchange, search, dateFrom, dateTo, page = "1", limit = "20" } = req.query as Record<string, string>;
    const result = await vs.getVehicles({ vehicleType, status, saleStatus, fundingSource, isFromExchange, search, dateFrom, dateTo, page: +page, limit: +limit });
    res.json({ success: true, statusCode: 200, message: "Vehicles fetched", data: result });
};

export const getVehicle = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.getVehicleById(req.params.id);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle fetched", data: vehicle });
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.updateVehicle(req.params.id, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle updated", data: vehicle });
};

export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
    const ok = await vs.deleteVehicle(req.params.id);
    if (!ok) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle deleted" });
};

export const getVehicleStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await vs.getVehicleStats();
    res.json({ success: true, statusCode: 200, message: "Stats fetched", data: stats });
};

// ── Sale ─────────────────────────────────────────────────────────
export const recordSale = async (req: Request, res: Response): Promise<void> => {
    const parsed = recordSaleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.recordSale(req.params.id, parsed.data);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale recorded", data: vehicle });
};

export const updateSale = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateSaleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.recordSale(req.params.id, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale updated", data: vehicle });
};

export const undoSale = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.undoSale(req.params.id);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale undone", data: vehicle });
};

// ── Purchase Payments ─────────────────────────────────────────────
export const addPurchasePayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addPurchasePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.addPurchasePayment(req.params.id, parsed.data);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Purchase payment recorded", data: vehicle });
};

export const deletePurchasePayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.deletePurchasePayment(req.params.id, req.params.paymentId);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Payment deleted", data: vehicle });
};

// ── Sale Payments ─────────────────────────────────────────────────
export const addSalePayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addSalePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const result = await vs.addSalePayment(req.params.id, parsed.data);
    if (!result) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Sale payment recorded", data: result.vehicle, exchangeVehicle: result.exchangeVehicle });
};

export const deleteSalePayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.deleteSalePayment(req.params.id, req.params.paymentId);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Payment deleted", data: vehicle });
};

// ── Costs ─────────────────────────────────────────────────────────
export const updateCosts = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateCostsSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.updateCosts(req.params.id, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Costs updated", data: vehicle });
};

export const recalcCosts = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.recalcCosts(req.params.id);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Costs recalculated", data: vehicle });
};

export const addCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const parsed = addCostBreakdownItemSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const { category, ...item } = parsed.data;
    const vehicle = await vs.addCostBreakdownItem(req.params.id, category, item);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Cost item added", data: vehicle });
};

export const deleteCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.deleteCostBreakdownItem(req.params.id, req.params.itemId);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Cost item deleted", data: vehicle });
};

// ── Reports ───────────────────────────────────────────────────────
export const getProfitLossReport = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, dateFrom, dateTo } = req.query as Record<string, string>;
    const report = await vs.getProfitLossReport(vehicleType, dateFrom, dateTo);
    res.json({ success: true, statusCode: 200, message: "P&L report fetched", data: report });
};

export const getMonthlyReport = async (_req: Request, res: Response): Promise<void> => {
    const report = await vs.getMonthlyReport();
    res.json({ success: true, statusCode: 200, message: "Monthly report fetched", data: report });
};

export const getPendingReport = async (_req: Request, res: Response): Promise<void> => {
    const report = await vs.getPendingReport();
    res.json({ success: true, statusCode: 200, message: "Pending report fetched", data: report });
};

export const getInventoryReport = async (_req: Request, res: Response): Promise<void> => {
    const report = await vs.getInventoryReport();
    res.json({ success: true, statusCode: 200, message: "Inventory report fetched", data: report });
};

export const getPurchaseRegister = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, paymentStatus, search, dateFrom, dateTo, page = "1", limit = "20" } = req.query as Record<string, string>;
    const result = await vs.getPurchaseRegister({ vehicleType, paymentStatus, search, dateFrom, dateTo, page: +page, limit: +limit });
    res.json({ success: true, statusCode: 200, message: "Purchase register fetched", data: result });
};

// ── Exchange Vehicle Lookup ─────────────────────────────────────────
export const lookupVehicles = async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query as Record<string, string>;
    const results = await vs.lookupVehiclesByRegNo(q || "");
    res.json({ success: true, statusCode: 200, message: "Lookup results", data: results });
};
