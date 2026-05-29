import { Request, Response } from "express";
import * as cs from "../services/consignment.service";
import { exportConsignmentsCSV, exportConsignmentsPDF } from "../services/consignment_list_export";
import { exportConsignmentDetailCSV, exportConsignmentDetailPDF } from "../services/consignment_detail_export";
import { exportConsignmentPLReportPDF } from "../services/consignment_pl_export";
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
    const vehicle = await cs.getConsignmentById(req.params.id as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Consignment fetched", data: vehicle });
};

export const updateConsignment = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateConsignmentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.updateConsignment(req.params.id as string, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Consignment updated", data: vehicle });
};

export const deleteConsignment = async (req: Request, res: Response): Promise<void> => {
    const ok = await cs.deleteConsignment(req.params.id as string);
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
    const vehicle = await cs.updateConsignmentStatus(req.params.id as string, parsed.data.status, parsed.data.notes);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Status updated", data: vehicle });
};

export const returnConsignment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.returnConsignment(req.params.id as string, req.body.notes);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle returned", data: vehicle });
};

// ── Costs ─────────────────────────────────────────────────────────

export const updateCosts = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateConsignmentCostsSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.updateCosts(req.params.id as string, parsed.data as Record<string, number>);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Costs updated", data: vehicle });
};

export const addCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const parsed = addCostBreakdownItemSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const { category, ...item } = parsed.data;
    const vehicle = await cs.addCostBreakdownItem(req.params.id as string, category, item);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Cost item added", data: vehicle });
};

export const deleteCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.deleteCostBreakdownItem(req.params.id as string, req.params.itemId as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Cost item deleted", data: vehicle });
};

// ── Sale ──────────────────────────────────────────────────────────

export const recordSale = async (req: Request, res: Response): Promise<void> => {
    const parsed = recordConsignmentSaleSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.recordSale(req.params.id as string, parsed.data);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale recorded", data: vehicle });
};

export const undoSale = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.undoSale(req.params.id as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale undone", data: vehicle });
};

// ── Buyer Payments ─────────────────────────────────────────────────

export const addBuyerPayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addBuyerPaymentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const result = await cs.addBuyerPayment(req.params.id as string, parsed.data as never);
    if (!result) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Buyer payment recorded", data: result.vehicle, exchangeVehicle: result.exchangeVehicle });
};

export const deleteBuyerPayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.deleteBuyerPayment(req.params.id as string, req.params.paymentId as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Buyer payment deleted", data: vehicle });
};

// ── Payee Payments ─────────────────────────────────────────────────

export const addPayeePayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addPayeePaymentSchema.safeParse(req.body);
    if (!parsed.success) { validationError(res, parsed.error.errors); return; }
    const vehicle = await cs.addPayeePayment(req.params.id as string, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Payee payment recorded", data: vehicle });
};

export const deletePayeePayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.deletePayeePayment(req.params.id as string, req.params.paymentId as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Payee payment deleted", data: vehicle });
};

export const closePayeeSettlement = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await cs.closePayeeSettlement(req.params.id as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Consignment not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Payee settlement closed", data: vehicle });
};

// ── Reports ───────────────────────────────────────────────────────

export const getReports = async (req: Request, res: Response): Promise<void> => {
    const { saleType, dateFrom, dateTo } = req.query as Record<string, string>;
    const report = await cs.getConsignmentReports(saleType, dateFrom, dateTo);
    res.json({ success: true, statusCode: 200, message: "Reports fetched", data: report });
};

export const exportReports = async (req: Request, res: Response): Promise<void> => {
    const { saleType, dateFrom, dateTo, format = "csv" } = req.query as Record<string, string>;
    const timestamp = new Date().toISOString().slice(0, 10);

    // Fetch only sold vehicles for P&L
    const allData = await cs.getConsignmentReports(saleType, dateFrom, dateTo);
    const vehicles = (allData as any).profitLoss as any[];

    if (format === "pdf") {
        const buf = await exportConsignmentPLReportPDF(vehicles, { saleType, dateFrom, dateTo });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="consignment_pl_report_${timestamp}.pdf"`);
        res.send(buf);
        return;
    }

    // CSV export
    const esc = (x: unknown) => { const s = String(x ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
    const dFmt = (d: unknown) => d ? new Date(d as string).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "-";
    const dINR = (n: unknown) => n == null ? "-" : `Rs. ${Math.abs(n as number).toLocaleString("en-IN")}`;
    const headers = ["Consignment ID", "Sale Type", "Vehicle Type", "Make", "Model", "Reg No", "Owner",
        "Date Received", "Date Sold", "Sold To", "Invested", "Sold Price", "Recon Cost", "Paid to Payee",
        "Net Profit", "P/L %", "Days in Shop", "Settlement"];
    const rows = vehicles.map((v: any) => [
        v.consignmentId, v.saleType === "park_sale" ? "Park Sale" : "Finance Sale",
        v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
        v.make, v.model, v.registrationNo, v.previousOwner,
        dFmt(v.dateReceived), dFmt(v.dateSold), v.soldTo ?? "-",
        dINR(v.totalInvestment), dINR(v.soldPrice), dINR(v.totalReconCost), dINR(v.paidToPayee),
        dINR(v.netProfit), `${(v.profitLossPercentage ?? 0).toFixed(1)}%`,
        v.daysInShop != null ? v.daysInShop : "-", (v.settlementStatus ?? "-").replace(/_/g, " "),
    ].map(esc).join(","));
    const csv = [headers.map(esc).join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="consignment_pl_report_${timestamp}.csv"`);
    res.send("\uFEFF" + csv);
};

// ── Export ────────────────────────────────────────────────────────

export const exportConsignments = async (req: Request, res: Response): Promise<void> => {
    const { format = "csv", saleType, vehicleType, status, search, dateFrom, dateTo } = req.query as Record<string, string>;
    const q = { saleType, vehicleType, status, search, dateFrom, dateTo };
    const date = new Date().toISOString().slice(0, 10);

    if (format === "pdf") {
        const buffer = await exportConsignmentsPDF(q);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="consignments_${date}.pdf"`);
        res.send(buffer);
        return;
    }

    // Default: CSV
    const csv = await exportConsignmentsCSV(q);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="consignments_${date}.csv"`);
    res.send(csv);
};

// ── Single Consignment Export ───────────────────────────────────────────────

export const exportConsignmentDetail = async (req: Request, res: Response): Promise<void> => {
    const { format } = req.query as Record<string, string>;
    const id = req.params.id as string;

    if (format !== "csv" && format !== "pdf") {
        res.status(400).json({ success: false, message: "format must be 'csv' or 'pdf'" });
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
        const csv = await exportConsignmentDetailCSV(id);
        if (!csv) { res.status(404).json({ success: false, message: "Consignment not found" }); return; }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="consignment_${id}_${timestamp}.csv"`);
        res.send("\uFEFF" + csv);
        return;
    }

    const pdf = await exportConsignmentDetailPDF(id);
    if (!pdf) { res.status(404).json({ success: false, message: "Consignment not found" }); return; }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="consignment_${id}_${timestamp}.pdf"`);
    res.send(pdf);
};
