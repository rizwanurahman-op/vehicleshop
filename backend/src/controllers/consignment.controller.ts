import { Request, Response } from "express";
import * as cs from "../services/consignment.service";
import {
    createConsignmentSchema, updateConsignmentSchema, updateConsignmentStatusSchema,
    updateConsignmentCostsSchema, addCostBreakdownItemSchema,
    recordConsignmentSaleSchema, addBuyerPaymentSchema, addPayeePaymentSchema,
} from "../schemas/consignment.schema";

const validationError = (res: Response, errors: unknown[]) =>
    res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: (errors as { path?: string[]; message: string }[]).map(e => ({ field: (e.path ?? []).join("."), message: e.message })) });

// ── CRUD ──────────────────────────────────────────────────────────

export const createConsignment = async (req: Request, res: Response): Promise<void> => {
    const parsed = createConsignmentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.createConsignment(parsed.data as never);
    res.status(201).json({ success: true, statusCode: 201, message: "Consignment registered successfully", data: vehicle });
};

export const getConsignments = async (req: Request, res: Response): Promise<void> => {
    const { saleType, vehicleType, status, settlementStatus, buyerPaymentStatus, payeePaymentStatus, search, dateFrom, dateTo, page = "1", limit = "20" } = req.query as Record<string, string>;
    const result = await cs.getConsignments({ saleType, vehicleType, status, settlementStatus, buyerPaymentStatus, payeePaymentStatus, search, dateFrom, dateTo, page: +page, limit: +limit });
    res.json({ success: true, statusCode: 200, message: "Consignments fetched", data: result });
};

export const getConsignment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.getConsignmentById(req.params.id);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Consignment fetched", data: vehicle });
};

export const updateConsignment = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateConsignmentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.updateConsignment(req.params.id, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Consignment updated", data: vehicle });
};

export const deleteConsignment = async (req: Request, res: Response): Promise<void> => {
    const ok = await cs.deleteConsignment(req.params.id);
    if (!ok) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Consignment deleted" });
};

export const getConsignmentStats = async (req: Request, res: Response): Promise<void> => {
    const { saleType } = req.query as Record<string, string>;
    const stats = await cs.getConsignmentStats(saleType);
    res.json({ success: true, statusCode: 200, message: "Stats fetched", data: stats });
};

export const updateConsignmentStatus = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateConsignmentStatusSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.updateConsignmentStatus(req.params.id, parsed.data.status, parsed.data.notes);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Status updated", data: vehicle });
};

export const returnConsignment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.returnConsignment(req.params.id, req.body.notes);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle returned", data: vehicle });
};

// ── Costs ─────────────────────────────────────────────────────────

export const updateCosts = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateConsignmentCostsSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.updateCosts(req.params.id, parsed.data as Record<string, number>);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Costs updated", data: vehicle });
};

export const addCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const parsed = addCostBreakdownItemSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const { category, ...item } = parsed.data;
    const vehicle = await cs.addCostBreakdownItem(req.params.id, category, item);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Cost item added", data: vehicle });
};

export const deleteCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.deleteCostBreakdownItem(req.params.id, req.params.itemId);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Cost item deleted", data: vehicle });
};

// ── Sale ──────────────────────────────────────────────────────────

export const recordSale = async (req: Request, res: Response): Promise<void> => {
    const parsed = recordConsignmentSaleSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.recordSale(req.params.id, parsed.data);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale recorded", data: vehicle });
};

export const undoSale = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.undoSale(req.params.id);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale undone", data: vehicle });
};

// ── Buyer Payments ─────────────────────────────────────────────────

export const addBuyerPayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addBuyerPaymentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const result = await cs.addBuyerPayment(req.params.id, parsed.data as never);
    if (!result) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Buyer payment recorded", data: result.vehicle, exchangeVehicle: result.exchangeVehicle });
};

export const deleteBuyerPayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.deleteBuyerPayment(req.params.id, req.params.paymentId);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Buyer payment deleted", data: vehicle });
};

// ── Payee Payments ─────────────────────────────────────────────────

export const addPayeePayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addPayeePaymentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.addPayeePayment(req.params.id, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Payee payment recorded", data: vehicle });
};

export const deletePayeePayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.deletePayeePayment(req.params.id, req.params.paymentId);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Payee payment deleted", data: vehicle });
};

export const closePayeeSettlement = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.closePayeeSettlement(req.params.id);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Payee settlement closed", data: vehicle });
};

// ── Reports ───────────────────────────────────────────────────────

export const getReports = async (req: Request, res: Response): Promise<void> => {
    const { saleType, dateFrom, dateTo } = req.query as Record<string, string>;
    const report = await cs.getConsignmentReports(saleType, dateFrom, dateTo);
    res.json({ success: true, statusCode: 200, message: "Reports fetched", data: report });
};
