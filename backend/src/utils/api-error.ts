export class ApiError extends Error {
    statusCode: number;
    errors?: { field: string; message: string }[];

    constructor(statusCode: number, message: string, errors?: { field: string; message: string }[]) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors;
        this.name = "ApiError";
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends ApiError {
    constructor(resource = "Resource") {
        super(404, `${resource} not found`);
        this.name = "NotFoundError";
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = "Unauthorized") {
        super(401, message);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = "Forbidden") {
        super(403, message);
        this.name = "ForbiddenError";
    }
}

export class ValidationError extends ApiError {
    constructor(errors: { field: string; message: string }[]) {
        super(400, "Validation failed", errors);
        this.name = "ValidationError";
    }
}

export class ConflictError extends ApiError {
    constructor(message: string) {
        super(409, message);
        this.name = "ConflictError";
    }
}
