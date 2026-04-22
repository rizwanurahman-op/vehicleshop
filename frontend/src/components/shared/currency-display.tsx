import { formatINR } from "@/lib/currency";
import { cn } from "@/lib/utils";

type CurrencyDisplayProps = {
    amount: number;
    className?: string;
    variant?: "default" | "success" | "warning" | "destructive" | "muted" | "primary";
    size?: "sm" | "md" | "lg";
};

const CurrencyDisplay = ({ amount, className, variant = "default", size = "md" }: CurrencyDisplayProps) => {
    const colorMap = {
        default: "text-foreground",
        primary: "text-primary",
        success: "text-success",
        warning: "text-warning",
        destructive: "text-destructive",
        muted: "text-muted-foreground",
    };
    const sizeMap = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-lg",
    };

    return (
        <span className={cn("font-mono font-semibold tabular-nums", colorMap[variant], sizeMap[size], className)}>
            {formatINR(amount)}
        </span>
    );
};

export default CurrencyDisplay;
