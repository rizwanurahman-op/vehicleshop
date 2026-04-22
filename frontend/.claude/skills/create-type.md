# Create Type Skill

## Description
Create ambient TypeScript type declarations following the VehicleBook project pattern.

## Instructions

### File location
`types/{Entity}.d.ts`

### Template

```tsx
type ILender = {
    _id: string;
    lenderId: string;        // L001 — auto-generated, display with font-mono
    name: string;
    phone?: string;
    address?: string;
    remarks?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};

type ILenderWithSummary = ILender & {
    totalBorrowed: number;
    totalRepaid: number;
    balancePayable: number;
};

type LenderPaginatedData = PaginatedData<ILenderWithSummary>;

type LendersResponse = ApiResponse<LenderPaginatedData>;

type LenderDetailResponse = ApiResponse<ILenderWithSummary>;
```

### Key conventions
- `.d.ts` extension — ambient declarations (no `export` keyword needed, types are globally available)
- Use `_id: string` (MongoDB ObjectId) not `id: number`
- Always include: single entity type, paginated data type, list response type, detail response type
- Use `string` for date fields (`createdAt`, `updatedAt`, `dateSold`, etc.)
- `?` for nullable/optional fields
- Prefix interfaces with `I` when they represent a database document (e.g., `ILender`, `IVehicle`, `IConsignmentVehicle`)
- `ErrorData` and `ApiErrorResponse` already exist in `types/ApiResponse.d.ts`
- `PaginatedData<T>` already exists in `types/ApiResponse.d.ts` — use it

### Payment mode type (shared across all phases)
```tsx
type PaymentMode = 'Cash' | 'Online' | 'Cheque' | 'UPI' | 'GPay' | 'Finance' | 'Bank Transfer';
```

### Vehicle-specific types
```tsx
type VehicleType = 'two_wheeler' | 'four_wheeler';
type VehicleStatus = 'in_stock' | 'reconditioning' | 'ready_for_sale' | 'sold' | 'sold_pending' | 'exchanged';
type SaleType = 'park_sale' | 'finance_sale';
type ConsignmentStatus = 'received' | 'reconditioning' | 'ready_for_sale' | 'sold' | 'sold_pending' | 'returned';
type SettlementStatus = 'open' | 'buyer_settled' | 'payee_settled' | 'fully_closed';
```
