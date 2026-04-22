import { Request, Response } from "express";
import * as es from "../services/exchange.service";

export const getExchanges = async (req: Request, res: Response): Promise<void> => {
    const { collection, dateFrom, dateTo, page = "1", limit = "20" } = req.query as Record<string, string>;
    const result = await es.getExchanges({ collection, dateFrom, dateTo, page: +page, limit: +limit });
    res.json({ success: true, statusCode: 200, message: "Exchanges fetched", data: result });
};

export const getExchangeStats = async (_req: Request, res: Response): Promise<void> => {
    const stats = await es.getExchangeStats();
    res.json({ success: true, statusCode: 200, message: "Exchange stats fetched", data: stats });
};
