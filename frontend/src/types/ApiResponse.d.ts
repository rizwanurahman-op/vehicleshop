interface ApiResponse<T = unknown> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    meta?: PaginationMeta;
}

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface PaginatedData<T> {
    items: T[];
    meta: PaginationMeta;
}

interface ErrorData {
    success: false;
    statusCode: number;
    message: string;
    errors?: FieldError[];
}

interface FieldError {
    field: string;
    message: string;
}

type ApiErrorResponse = ErrorData;
