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
    const vehicle = await vs.getVehicleById(req.params.id as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle fetched", data: vehicle });
};

export const updateVehicle = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateVehicleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.updateVehicle(req.params.id as string, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle updated", data: vehicle });
};

export const deleteVehicle = async (req: Request, res: Response): Promise<void> => {
    const ok = await vs.deleteVehicle(req.params.id as string);
    if (!ok) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Vehicle deleted" });
};

export const getVehicleStats = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, dateFrom, dateTo, status, isFromExchange, search } = req.query as Record<string, string>;
    const stats = await vs.getVehicleStats({ vehicleType, dateFrom, dateTo, status, isFromExchange, search });
    res.json({ success: true, statusCode: 200, message: "Stats fetched", data: stats });
};

// ── Sale ─────────────────────────────────────────────────────────
export const recordSale = async (req: Request, res: Response): Promise<void> => {
    const parsed = recordSaleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.recordSale(req.params.id as string, parsed.data);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale recorded", data: vehicle });
};

export const updateSale = async (req: Request, res: Response): Promise<void> => {
    const parsed = updateSaleSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.recordSale(req.params.id as string, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale updated", data: vehicle });
};

export const undoSale = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.undoSale(req.params.id as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Sale undone", data: vehicle });
};

export const updateNocStatus = async (req: Request, res: Response): Promise<void> => {
    const { z } = await import("zod");
    const schema = z.object({
        nocStatus: z.enum(["pending", "received", "submitted", "completed"]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.updateNocStatus(req.params.id as string, parsed.data.nocStatus);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "NOC status updated", data: vehicle });
};

// ── Purchase Payments ─────────────────────────────────────────────
export const addPurchasePayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = addPurchasePaymentSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ success: false, statusCode: 400, message: "Validation failed", errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })) });
        return;
    }
    const vehicle = await vs.addPurchasePayment(req.params.id as string, parsed.data);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Purchase payment recorded", data: vehicle });
};

export const deletePurchasePayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.deletePurchasePayment(req.params.id as string, req.params.paymentId as string);
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
    const result = await vs.addSalePayment(req.params.id as string, parsed.data);
    if (!result) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Sale payment recorded", data: result.vehicle, exchangeVehicle: result.exchangeVehicle });
};

export const deleteSalePayment = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.deleteSalePayment(req.params.id as string, req.params.paymentId as string);
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
    const vehicle = await vs.updateCosts(req.params.id as string, parsed.data as never);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Costs updated", data: vehicle });
};

export const recalcCosts = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.recalcCosts(req.params.id as string);
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
    const vehicle = await vs.addCostBreakdownItem(req.params.id as string, category, item);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Vehicle not found" }); return; }
    res.status(201).json({ success: true, statusCode: 201, message: "Cost item added", data: vehicle });
};

export const deleteCostBreakdownItem = async (req: Request, res: Response): Promise<void> => {
    const vehicle = await vs.deleteCostBreakdownItem(req.params.id as string, req.params.itemId as string);
    if (!vehicle) { res.status(404).json({ success: false, statusCode: 404, message: "Not found" }); return; }
    res.json({ success: true, statusCode: 200, message: "Cost item deleted", data: vehicle });
};

// ── Reports ───────────────────────────────────────────────────────
export const getProfitLossReport = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, dateFrom, dateTo } = req.query as Record<string, string>;
    const report = await vs.getProfitLossReport(vehicleType, dateFrom, dateTo);
    res.json({ success: true, statusCode: 200, message: "P&L report fetched", data: report });
};

export const exportProfitLoss = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, dateFrom, dateTo, format = "csv" } = req.query as Record<string, string>;
    const vehicles = await vs.getProfitLossReport(vehicleType, dateFrom, dateTo);
    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
        const esc = (x: unknown) => { const s = String(x ?? ""); return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
        const dFmt = (d: unknown) => d ? new Date(d as string).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
        const dINR = (n: unknown) => n == null ? "—" : `Rs. ${Math.abs(n as number).toLocaleString("en-IN")}`;
        const getSaleStatusLabel = (s: string | null | undefined) => {
            if (!s) return "—";
            if (s === "fully_received") return "Fully Received";
            if (s === "balance_pending") return "Balance Pending";
            if (s === "noc_pending") return "NOC Pending";
            if (s === "noc_cash_pending") return "NOC & Balance Pending";
            return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        };
        const getNocStatusLabel = (s: string | null | undefined) => {
            if (!s) return "—";
            if (s === "not_applicable") return "Not Applicable";
            if (s === "pending") return "Pending";
            if (s === "received") return "Received";
            if (s === "submitted") return "Submitted";
            if (s === "completed") return "Completed";
            return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        };
        const headers = ["Vehicle ID", "Type", "Make", "Model", "Reg No", "Date Purchased", "Date Sold", "Total Invested", "Sold Price", "Profit/Loss", "P/L %", "Days to Sell", "Sale Status", "NOC Status"];
        const rows = (vehicles as any[]).map(v => [
            v.vehicleId, v.vehicleType === "two_wheeler" ? "Two Wheeler" : "Four Wheeler",
            v.make, v.model, v.registrationNo,
            dFmt(v.datePurchased), dFmt(v.dateSold),
            dINR(v.totalInvestment), dINR(v.soldPrice),
            dINR(v.profitLoss), `${(v.profitLossPercentage ?? 0).toFixed(1)}%`,
            v.daysToSell != null ? v.daysToSell : "—",
            getSaleStatusLabel(v.saleStatus), getNocStatusLabel(v.nocStatus),
        ].map(esc).join(","));
        const csv = [headers.map(esc).join(","), ...rows].join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="pl_report_${timestamp}.csv"`);
        res.send("\uFEFF" + csv);
        return;
    }

    if (format === "pdf") {
        const { exportPLReportPDF } = await import("../services/pl_report_export");
        const buf = await exportPLReportPDF(vehicles as any[], { vehicleType, dateFrom, dateTo });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="pl_report_${timestamp}.pdf"`);
        res.send(buf);
        return;
    }

    res.status(400).json({ success: false, message: "format must be 'csv' or 'pdf'" });
};

export const getMonthlyReport = async (_req: Request, res: Response): Promise<void> => {
    const report = await vs.getMonthlyReport();
    res.json({ success: true, statusCode: 200, message: "Monthly report fetched", data: report });
};

export const getPendingReport = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, dateFrom, dateTo } = req.query as Record<string, string>;
    const report = await vs.getPendingReport({ vehicleType, dateFrom, dateTo });
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

export const exportPurchases = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, paymentStatus, search, dateFrom, dateTo, format } = req.query as Record<string, string>;

    if (format !== "csv" && format !== "pdf") {
        res.status(400).json({ success: false, message: "format must be 'csv' or 'pdf'" });
        return;
    }

    const { exportPurchasesCSV, exportPurchasesPDF } = await import("../services/purchase_export");
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `purchase_register_${timestamp}`;

    if (format === "csv") {
        const csv = await exportPurchasesCSV({ vehicleType, paymentStatus, search, dateFrom, dateTo });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send("\uFEFF" + csv);
        return;
    }

    const pdfBuffer = await exportPurchasesPDF({ vehicleType, paymentStatus, search, dateFrom, dateTo });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
    res.send(pdfBuffer);
};

// ── Exchange Vehicle Lookup ─────────────────────────────────────────
export const lookupVehicles = async (req: Request, res: Response): Promise<void> => {
    const { q } = req.query as Record<string, string>;
    const results = await vs.lookupVehiclesByRegNo(q || "");
    res.json({ success: true, statusCode: 200, message: "Lookup results", data: results });
};

// ── Export ─────────────────────────────────────────────────────────
export const exportVehicles = async (req: Request, res: Response): Promise<void> => {
    const { vehicleType, status, isFromExchange, search, dateFrom, dateTo, format } = req.query as Record<string, string>;

    if (format !== "csv" && format !== "pdf") {
        res.status(400).json({ success: false, message: "format must be 'csv' or 'pdf'" });
        return;
    }

    const query = { vehicleType, status, isFromExchange, search, dateFrom, dateTo, format } as Parameters<typeof vs.exportVehiclesCSV>[0];
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `vehicles_${timestamp}`;

    if (format === "csv") {
        const csv = await vs.exportVehiclesCSV(query);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.send("\uFEFF" + csv); // BOM prefix for Excel UTF-8 compatibility
        return;
    }

    // PDF
    const pdfBuffer = await vs.exportVehiclesPDF(query);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
    res.send(pdfBuffer);
};

// ── Single Vehicle Export ──────────────────────────────────────────
export const exportVehicleDetail = async (req: Request, res: Response): Promise<void> => {
    const { format } = req.query as Record<string, string>;
    const id = req.params.id as string;

    if (format !== "csv" && format !== "pdf") {
        res.status(400).json({ success: false, message: "format must be 'csv' or 'pdf'" });
        return;
    }

    const timestamp = new Date().toISOString().slice(0, 10);

    if (format === "csv") {
        const csv = await vs.exportVehicleDetailCSV(id);
        if (!csv) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="vehicle_${id}_${timestamp}.csv"`);
        res.send("\uFEFF" + csv);
        return;
    }

    const pdf = await vs.exportVehicleDetailPDF(id);
    if (!pdf) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="vehicle_${id}_${timestamp}.pdf"`);
    res.send(pdf);
};

