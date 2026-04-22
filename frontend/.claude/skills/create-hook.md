# Create Hook Skill

## Description
Create a shared React Query hook for client-side data fetching following the VehicleBook project pattern.

## Instructions

Only create a hook when the same data fetch is needed in 2+ client components.

### File location
`hooks/use-{entities}.ts`

### Template

```tsx
import axios from "@config/axios";
import { useQuery } from "@tanstack/react-query";

const fetchAllLenders = async (status?: string): Promise<ILenderWithSummary[]> => {
    const params: Record<string, string | number> = { limit: 1000 };
    if (status && status !== "all") {
        params.isActive = status === "active" ? "true" : "false";
    }
    const response = await axios.get<LendersResponse>("/lenders", { params });
    return response?.data?.data?.results ?? [];
};

const useAllLenders = (status?: string, initialData?: ILenderWithSummary[]) => {
    return useQuery<ILenderWithSummary[]>({
        queryKey: status ? ["lenders-all", status] : ["lenders-all"],
        queryFn: () => fetchAllLenders(status),
        ...(initialData ? { initialData } : {}),
        retry: 0,
    });
};

export default useAllLenders;
```

### Key conventions
- `axios` from `@config/axios` (auto-injects Bearer token)
- Never add `try/catch` inside `queryFn` — let React Query handle errors
- `limit: 1000` for "fetch all" hooks
- Support optional `initialData` from server component
- Default export
- Query key must be descriptive and consistent (see CLAUDE.md § React Query — consistent query keys)
