import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
    status: "active" | "inactive";
    className?: string;
};

const StatusBadge = ({ status, className }: StatusBadgeProps) => {
    const config = {
        active: {
            label: "Active",
            className: "bg-success/10 text-success border-success/20",
        },
        inactive: {
            label: "Inactive",
            className: "bg-muted text-muted-foreground border-border",
        },
    };

    const c = config[status];
    return (
        <Badge variant="outline" className={cn("text-[11px] font-semibold border px-2 py-0.5", c.className, className)}>
            {c.label}
        </Badge>
    );
};

export default StatusBadge;
