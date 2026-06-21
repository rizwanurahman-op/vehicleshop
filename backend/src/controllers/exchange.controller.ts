import { Request, Response } from "express";
import * as es from "../services/exchange.service";
import { exportExchangesCSV, exportExchangesPDF } from "../services/exchange_export";

export const getExchanges = async (req: Request, res: Response): Promise<void> => {
    const { collection, dateFrom, dateTo } = req.query as Record<string, string>;
    const page  = Math.max(1, parseInt((req.query.page  as string) ?? "1",  10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? "20", 10) || 20));
    const result = await es.getExchanges({ collection, dateFrom, dateTo, page, limit });
    res.json({ success: true, statusCode: 200, message: "Exchanges fetched", data: result });
};

export const getExchangeStats = async (req: Request, res: Response): Promise<void> => {
    const { dateFrom, dateTo, collection } = req.query as Record<string, string>;
    const stats = await es.getExchangeStats({ dateFrom, dateTo, collection });
    res.json({ success: true, statusCode: 200, message: "Exchange stats fetched", data: stats });
};

export const exportExchanges = async (req: Request, res: Response): Promise<void> => {
    const { collection, dateFrom, dateTo, format = "csv" } = req.query as Record<string, string>;
    const timestamp = new Date().toISOString().slice(0, 10);
    const filters = { collection, dateFrom, dateTo };

    // Fetch all (no pagination) for export
    const result = await es.getExchanges({ collection, dateFrom, dateTo, page: 1, limit: 10_000 });
    const deals = result.data;

    if (format === "pdf") {
        const buf = await exportExchangesPDF(deals, filters);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="exchanges_${timestamp}.pdf"`);
        res.send(buf);
        return;
    }

    const csv = exportExchangesCSV(deals, filters);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="exchanges_${timestamp}.csv"`);
    res.send("\uFEFF" + csv);
};
