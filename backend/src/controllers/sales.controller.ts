import { Request, Response } from "express";
import { getSales } from "../services/sales.service";
import { exportSalesCSV, exportSalesPDF } from "../services/sales_export";

export const getSalesRegister = async (req: Request, res: Response): Promise<void> => {
    const {
        source, saleStatus, search, dateFrom, dateTo,
        isExchange, page = "1", limit = "20",
    } = req.query as Record<string, string>;

    const result = await getSales({
        source, saleStatus, search, dateFrom, dateTo, isExchange,
        page: +page, limit: +limit,
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
