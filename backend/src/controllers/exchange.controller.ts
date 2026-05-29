import { Request, Response } from "express";
import * as es from "../services/exchange.service";
import { exportExchangesCSV, exportExchangesPDF } from "../services/exchange_export";

export const getExchanges = async (req: Request, res: Response): Promise<void> => {
    const { collection, dateFrom, dateTo, page = "1", limit = "20" } = req.query as Record<string, string>;
    const result = await es.getExchanges({ collection, dateFrom, dateTo, page: +page, limit: +limit });
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
