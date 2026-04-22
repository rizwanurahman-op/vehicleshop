import { PaginationMeta } from "./api-response";

export interface PaginationQuery {
    page?: string;
    limit?: string;
}

export const getPagination = (query: PaginationQuery): { page: number; limit: number; skip: number } => {
    const page = Math.max(1, parseInt(query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || "10", 10)));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};

export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});
