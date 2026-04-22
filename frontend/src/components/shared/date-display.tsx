import { formatDate, formatDateLong } from "@/lib/date";
import { cn } from "@/lib/utils";

type DateDisplayProps = {
    date: string | Date | undefined | null;
    format?: "short" | "long";
    className?: string;
};

const DateDisplay = ({ date, format = "short", className }: DateDisplayProps) => {
    const formatted = format === "long" ? formatDateLong(date) : formatDate(date);
    return <span className={cn("text-sm", className)}>{formatted}</span>;
};

export default DateDisplay;
