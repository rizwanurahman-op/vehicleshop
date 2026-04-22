import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingSkeletonProps = {
    rows?: number;
    className?: string;
};

export const TableSkeleton = ({ rows = 5, className }: LoadingSkeletonProps) => (
    <div className={cn("space-y-3", className)}>
        <Skeleton className="h-10 w-full rounded-lg" />
        {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
    </div>
);

export const CardSkeleton = ({ className }: { className?: string }) => (
    <div className={cn("rounded-xl border border-border bg-card p-5 space-y-3", className)}>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
    </div>
);

export const StatCardsSkeleton = () => (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
    </div>
);

const LoadingSkeleton = ({ rows = 5 }: LoadingSkeletonProps) => <TableSkeleton rows={rows} />;

export default LoadingSkeleton;
