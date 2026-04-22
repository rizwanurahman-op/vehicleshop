import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";

/** Format date as DD-MM-YYYY */
export const formatDate = (date: string | Date | undefined | null): string => {
    if (!date) return "—";
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return format(d, "dd-MM-yyyy");
};

/** Format date as "10 Apr 2025" */
export const formatDateLong = (date: string | Date | undefined | null): string => {
    if (!date) return "—";
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return format(d, "dd MMM yyyy");
};

/** Format as "2 hours ago" */
export const formatRelative = (date: string | Date | undefined | null): string => {
    if (!date) return "—";
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "—";
    return formatDistanceToNow(d, { addSuffix: true });
};

/** Format for input[type=date] — YYYY-MM-DD */
export const formatDateInput = (date: string | Date | undefined | null): string => {
    if (!date) return "";
    const d = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(d)) return "";
    return format(d, "yyyy-MM-dd");
};

/** Format month-year for charts */
export const formatMonthYear = (year: number, month: number): string => {
    return format(new Date(year, month - 1), "MMM yy");
};
