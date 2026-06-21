import { Request, Response } from "express";
import { getSales } from "../services/sales.service";
import { exportSalesCSV, exportSalesPDF } from "../services/sales_export";

export const getSalesRegister = async (req: Request, res: Response): Promise<void> => {
    const { source, saleStatus, dateFrom, dateTo, isExchange } = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt((req.query.page  as string) ?? "1",  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? "20", 10) || 20));
    const search = ((req.query.search as string) ?? "").slice(0, 100) || undefined;

    const result = await getSales({
        source, saleStatus, search, dateFrom, dateTo, isExchange,
        page, limit,
    });

    res.json({ success: true, statusCode: 200, message: "Sales register fetched", data: result });
};

export const exportSalesRegister = async (req: Request, res: Response): Promise<void> => {
    const { source, saleStatus, search, dateFrom, dateTo, isExchange, format = "csv" } = req.query as Record<string, string>;
    const q = { source, saleStatus, search, dateFrom, dateTo, isExchange };

    if (format === "pdf") {
        const buf = await exportSalesPDF(q);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="sales_register_${new Date().toISOString().slice(0, 10)}.pdf"`);
        res.send(buf);
    } else {
        const csv = await exportSalesCSV(q);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="sales_register_${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send(csv);
    }
};
