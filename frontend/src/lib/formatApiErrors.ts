import { AxiosError } from "axios";

interface FieldError {
    field: string;
    message: string;
}

export const formatApiErrors = (errors?: FieldError[]): string => {
    if (!errors || errors.length === 0) return "";
    return errors.map(e => `${e.field}: ${e.message}`).join(", ");
};

export const getErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
        const data = error.response?.data as { message?: string; errors?: FieldError[] };
        const fieldErrors = formatApiErrors(data?.errors);
        return fieldErrors || data?.message || "An error occurred";
    }
    if (error instanceof Error) return error.message;
    return "An unknown error occurred";
};
