import { Request, Response } from "express";
import { getSales } from "../services/sales.service";

export const getSalesRegister = async (req: Request, res: Response): Promise<void> => {
    const {
        source, saleStatus, search, dateFrom, dateTo,
        isExchange, page = "1", limit = "20",
    } = req.query as Record<string, string>;

    const result = await getSales({
        source,
        saleStatus,
        search,
        dateFrom,
        dateTo,
        isExchange,
        page: +page,
        limit: +limit,
    });

    res.json({
        success: true,
        statusCode: 200,
        message: "Sales register fetched",
        data: result,
    });
};
