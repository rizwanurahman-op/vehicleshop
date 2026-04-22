export interface ApiSuccessResponse<T = unknown> {
    success: true;
    statusCode: number;
    message: string;
    data?: T;
    meta?: PaginationMeta;
}

export interface ApiErrorResponse {
    success: false;
    statusCode: number;
    message: string;
    errors?: FieldError[];
}

export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface FieldError {
    field: string;
    message: string;
}

export const apiResponse = <T>(
    statusCode: number,
    message: string,
    data?: T,
    meta?: PaginationMeta
): ApiSuccessResponse<T> => ({
    success: true,
    statusCode,
    message,
    data,
    meta,
});

export const apiError = (
    statusCode: number,
    message: string,
    errors?: FieldError[]
): ApiErrorResponse => ({
    success: false,
    statusCode,
    message,
    errors,
});
