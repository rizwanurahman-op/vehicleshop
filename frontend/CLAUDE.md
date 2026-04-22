# CLAUDE.md — VehicleBook (Frontend)

## 1. Project Overview

VehicleBook — a vehicle shop management system for digitizing bike & car sales, purchases, investor management, and consignment tracking. Connects to the Express.js backend at `NEXT_PUBLIC_API_URL`.

### Modules

| Route | Phase | Description |
|---|---|---|
| `/dashboard` | All | Executive overview — combined stats from all phases |
| `/lenders` | 1 | Investor/Lender registry — manage investors who fund the shop |
| `/investments` | 1 | Investment register — money received from lenders |
| `/repayments` | 1 | Repayment register — money paid back to lenders |
| `/summary` | 1 | Lender summary — auto-calculated borrowing/repayment/balance |
| `/vehicles` | 2 | Vehicle inventory — purchased bikes & cars (2W/4W tabs) |
| `/vehicles/[id]` | 2 | Vehicle detail — costs, payments, docs, activity log |
| `/vehicles/new` | 2 | Add vehicle — 5-step purchase wizard |
| `/purchases` | 2 | Purchase timeline — all purchase history |
| `/sales` | 2 | Sales register — sold vehicles + pending tracking |
| `/vehicles/reports` | 2 | Vehicle reports — P&L, cost analysis, funding breakdown |
| `/consignments` | 3 | Consignment inventory — park sale & finance sale (tabs) |
| `/consignments/[id]` | 3 | Consignment detail — costs, buyer/payee payments, docs |
| `/consignments/new` | 3 | Register consignment — type selector + 3-step form |
| `/consignments/reports` | 3 | Consignment reports — P&L, settlements, aging |
| `/vehicle-owners` | 3 | Owner registry — park sale vehicle owners |
| `/vehicle-owners/[id]` | 3 | Owner detail — vehicle history + payment summary |
| `/profile` | — | User account management |

## 2. Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
npm start        # Start production server
```

## 3. First-Time Setup

Copy env file and install shadcn/ui components:

```bash
cp .env.example .env

npx shadcn@latest add button input label card dialog alert-dialog badge separator scroll-area avatar dropdown-menu select textarea tabs tooltip progress switch checkbox sonner table calendar popover command sheet
```

## 4. Folder Structure

Every route has a `page.tsx` (server component) and a `components/` folder with an `index.ts` barrel export. All UI code lives inside `components/`.

```
app/
  layout.tsx                         # Root layout
  globals.css                        # Tailwind + custom design tokens
  not-found.tsx                      # 404 page

  ─── AUTH (Public — no sidebar/navbar) ───────────────────────

  (auth)/
    layout.tsx                       # Auth layout (centered card, no chrome)
    auth/
      login/
        page.tsx                     # Login page (SSR)
        components/
          index.ts                   # ← barrel: { LoginForm }
          login-form.tsx             # "use client" — email/password form

  ─── DASHBOARD (Protected — sidebar + navbar layout) ────────

  (dashboard)/
    layout.tsx                       # Dashboard layout (sidebar + header + mobile nav)

    ── Phase 1: Investor Management ──

    dashboard/
      page.tsx                       # Executive overview (SSR)
      components/
        index.ts                     # ← barrel: { DashboardStats, RecentTransactions, ... }
        dashboard-stats.tsx          # 4 stat cards with animated counters
        recent-transactions.tsx      # Combined investment + repayment feed
        outstanding-chart.tsx        # Top lenders bar chart
        trend-chart.tsx              # Investment vs Repayment area chart
        quick-actions.tsx            # "Add Investment", "Add Repayment", "Add Lender"

    lenders/
      page.tsx                       # Lender master list (SSR)
      components/
        index.ts                     # ← barrel: { LenderList, LenderCard, CreateLenderDialog, ... }
        lender-list.tsx              # "use client" — data table with useQuery
        lender-card.tsx              # Summary card (borrowed, repaid, balance)
        create-lender-dialog.tsx     # Add lender dialog
        update-lender-dialog.tsx     # Edit lender dialog
        delete-lender-dialog.tsx     # Confirmation dialog
      [id]/
        page.tsx                     # Lender detail (SSR)
        components/
          index.ts                   # ← barrel: { LenderDetail, LenderInvestments, LenderRepayments, ... }
          lender-detail.tsx          # Hero card + 3 stat boxes
          lender-investments.tsx     # Investments tab table
          lender-repayments.tsx      # Repayments tab table
          lender-timeline.tsx        # Combined chronological view
          lender-chart.tsx           # Investment vs repayment trend
      new/
        page.tsx                     # Add new lender (SSR)
        components/
          index.ts                   # ← barrel: { LenderForm }
          lender-form.tsx            # Full lender form

    investments/
      page.tsx                       # Investment register (SSR)
      components/
        index.ts                     # ← barrel: { InvestmentList, CreateInvestmentDialog, ... }
        investment-list.tsx          # "use client" — data table
        investment-card.tsx          # Summary card
        create-investment-dialog.tsx # Record investment dialog
        update-investment-dialog.tsx # Edit investment dialog
        delete-investment-dialog.tsx # Confirmation dialog
        investment-filters.tsx       # Date range, lender, mode filters
      [id]/
        page.tsx                     # Investment detail (SSR)
        components/
          index.ts                   # ← barrel: { InvestmentDetail }
          investment-detail.tsx      # Full investment detail view
      new/
        page.tsx                     # Record new investment (SSR)
        components/
          index.ts                   # ← barrel: { InvestmentForm }
          investment-form.tsx        # Investment form (lender dropdown + amount + mode)

    repayments/
      page.tsx                       # Repayment register (SSR)
      components/
        index.ts                     # ← barrel: { RepaymentList, CreateRepaymentDialog, ... }
        repayment-list.tsx           # "use client" — data table
        repayment-card.tsx           # Summary card
        create-repayment-dialog.tsx  # Record repayment dialog
        update-repayment-dialog.tsx  # Edit repayment dialog
        delete-repayment-dialog.tsx  # Confirmation dialog
        repayment-filters.tsx        # Date range, lender, mode filters
      [id]/
        page.tsx
        components/
          index.ts                   # ← barrel: { RepaymentDetail }
          repayment-detail.tsx
      new/
        page.tsx
        components/
          index.ts                   # ← barrel: { RepaymentForm }
          repayment-form.tsx

    summary/
      page.tsx                       # Lender summary dashboard (SSR)
      components/
        index.ts                     # ← barrel: { SummaryTable, SummaryCards, SummaryCharts }
        summary-table.tsx            # Full lender summary table
        summary-cards.tsx            # Top-level stat cards
        summary-charts.tsx           # Pie + bar charts

    ── Phase 2: Vehicle Purchase & Sales ──

    vehicles/
      page.tsx                       # Vehicle inventory list (SSR)
      components/
        index.ts                     # ← barrel: { VehicleList, VehicleCard, VehicleFilters, ... }
        vehicle-list.tsx             # "use client" — sortable/filterable data table
        vehicle-card.tsx             # Summary card for dashboards
        vehicle-filters.tsx          # Advanced filter panel (type, status, date)
        vehicle-status-badge.tsx     # Color-coded status badges
        vehicle-type-icon.tsx        # 🏍️/🚗 icon component
      [id]/
        page.tsx                     # Vehicle detail (SSR)
        components/
          index.ts                   # ← barrel: { VehicleDetail, CostBreakdown, PaymentTimeline, ... }
          vehicle-detail.tsx         # Full detail view with tabs
          vehicle-timeline.tsx       # Activity timeline
          cost-breakdown.tsx         # Visual cost breakdown with items
          cost-form.tsx              # Add/edit cost modal
          cost-items-form.tsx        # Inline itemized entry
          cost-summary-chart.tsx     # Donut chart of cost distribution
          funding-form.tsx           # Own/Investor selector
          funding-badge.tsx          # 👤/🏦/🔄 funding indicator
          funding-summary.tsx        # Funding analytics
          purchase-payment-form.tsx  # Record purchase payment
          sale-form.tsx              # Record sale modal
          sale-payment-form.tsx      # Record sale receipt (+ exchange)
          payment-timeline.tsx       # Visual timeline grouped by bank
          payment-progress-bar.tsx   # Progress bar (received/total)
          pending-alert.tsx          # Balance pending alert card
          noc-status-badge.tsx       # NOC status indicator (4W)
          profit-loss-badge.tsx      # Green/red P&L indicator
          document-upload.tsx        # Drag-and-drop file uploader
          document-list.tsx          # Document gallery/list
          document-viewer.tsx        # Image/PDF preview modal
      new/
        page.tsx                     # 5-step purchase wizard (SSR)
        components/
          index.ts                   # ← barrel: { VehicleForm, VehicleFormSteps }
          vehicle-form.tsx           # Multi-step purchase wizard
          vehicle-form-steps.tsx     # Step indicator + navigation
      reports/
        page.tsx                     # Reports & analytics (SSR)
        components/
          index.ts                   # ← barrel: { ProfitLossReport, InventoryReport, ... }
          profit-loss-report.tsx     # P&L dashboard (2W/4W split)
          inventory-report.tsx       # Stock status overview
          funding-report.tsx         # Own vs investor breakdown
          pending-report.tsx         # All pending items
          cost-analysis-chart.tsx    # Avg costs radar chart
          monthly-trend-chart.tsx    # Monthly purchase/sale/profit trends

    purchases/
      page.tsx                       # All purchases timeline (SSR)
      components/
        index.ts                     # ← barrel: { PurchaseTimeline }
        purchase-timeline.tsx        # All purchases chronological

    sales/
      page.tsx                       # Sales register + pending (SSR)
      components/
        index.ts                     # ← barrel: { SalesList, SalesFilters }
        sales-list.tsx               # Sales data table
        sales-filters.tsx            # Sale status, date range, type filters

    ── Phase 3: Consignment Management ──

    consignments/
      page.tsx                       # Consignment inventory (SSR)
      components/
        index.ts                     # ← barrel: { ConsignmentList, ConsignmentFilters, ... }
        consignment-list.tsx         # "use client" — unified table with saleType tabs
        consignment-card.tsx         # Summary card
        consignment-filters.tsx      # Filter panel (saleType, status, settlement)
        consignment-status-badge.tsx # Status badges
        sale-type-selector.tsx       # Park Sale / Finance Sale toggle
      [id]/
        page.tsx                     # Consignment detail (SSR)
        components/
          index.ts                   # ← barrel: { ConsignmentDetail, BuyerPaymentForm, ... }
          consignment-detail.tsx     # Detail view — labels adapt by saleType
          consignment-timeline.tsx   # Activity timeline
          cost-breakdown.tsx         # Reconditioning costs (8 categories)
          cost-form.tsx              # Add/edit cost modal
          buyer-payment-form.tsx     # Receive buyer payment (cash/exchange)
          buyer-payment-timeline.tsx # Buyer payment history
          buyer-exchange-form.tsx    # Exchange vehicle entry
          payee-payment-form.tsx     # Pay owner/finance modal
          payee-payment-timeline.tsx # Owner/Finance payment history
          payee-settlement.tsx       # Settlement status card
          payee-balance-alert.tsx    # Balance owed alert
          sale-form.tsx              # Record sale modal
          document-upload.tsx        # Drag-and-drop uploader
          document-list.tsx          # Document gallery
      new/
        page.tsx                     # Register consignment (SSR)
        components/
          index.ts                   # ← barrel: { ConsignmentForm, TypeSelector }
          consignment-form.tsx       # 3-step form (labels adapt by saleType)
          type-selector.tsx          # Park Sale vs Finance Sale cards
      reports/
        page.tsx                     # Consignment reports (SSR)
        components/
          index.ts                   # ← barrel: { ConsignmentPLReport, SettlementReport, ... }
          consignment-pl-report.tsx  # Unified P&L
          settlement-report.tsx      # Open settlements
          owner-report.tsx           # Per-owner analytics
          pending-report.tsx         # Pending payments
          aging-report.tsx           # Unsold aging
          consignment-trend-chart.tsx # Monthly trends

    vehicle-owners/
      page.tsx                       # Owner registry (SSR)
      components/
        index.ts                     # ← barrel: { OwnerList, CreateOwnerDialog, ... }
        owner-list.tsx               # "use client" — owner data table
        owner-card.tsx               # Owner summary card
        create-owner-dialog.tsx      # Add owner dialog
        update-owner-dialog.tsx      # Edit owner dialog
        delete-owner-dialog.tsx      # Confirmation dialog
      [id]/
        page.tsx                     # Owner detail (SSR)
        components/
          index.ts                   # ← barrel: { OwnerDetail, OwnerVehicles, OwnerSummary }
          owner-detail.tsx           # Owner profile + stats
          owner-vehicles.tsx         # Vehicles parked by owner
          owner-summary.tsx          # Payment summary

    profile/
      page.tsx                       # User account (SSR)
      components/
        index.ts                     # ← barrel: { ProfileForm }
        profile-form.tsx             # Edit profile form

─── TOP-LEVEL SHARED COMPONENTS (not route-specific) ─────────

components/
  ui/                                # Shadcn/ui components (installed via CLI)
  common/                            # Layout components
    index.ts                         # ← barrel: { Navbar, Sidebar, LogoutDialog, ThemeToggle, MobileNav, Breadcrumb }
    navbar.tsx                       # Top header with user menu
    sidebar.tsx                      # Collapsible sidebar navigation
    mobile-nav.tsx                   # Mobile bottom/slide navigation
    breadcrumb.tsx                   # Dynamic breadcrumbs
    logout-dialog.tsx                # Logout confirmation
    theme-toggle.tsx                 # Dark/Light toggle
  shared/                            # Cross-phase reusable components
    index.ts                         # ← barrel: { CurrencyDisplay, DateDisplay, StatusBadge, ... }
    currency-display.tsx             # ₹ formatted display (Indian number system)
    date-display.tsx                 # Formatted date component
    status-badge.tsx                 # Active/Inactive badges
    empty-state.tsx                  # Empty state illustrations
    loading-skeleton.tsx             # Page-level loading skeletons
    confirm-dialog.tsx               # Delete confirmation dialog
    export-button.tsx                # CSV export button
    search-input.tsx                 # Debounced search input
    payment-progress-bar.tsx         # Visual payment progress
    pending-alert.tsx                # Balance pending alert card
  exchange-vehicle/                  # SHARED — used by Phase 2 & Phase 3
    index.ts                         # ← barrel: { ExchangeCreateModal, ExchangeDestination, ExchangeLinkBadge }
    exchange-create-modal.tsx        # Exchange vehicle quick-create modal
    exchange-destination.tsx         # Where to create: Phase 2 / Phase 3
    exchange-link-badge.tsx          # Cross-link to exchange source/target

─── SUPPORTING FILES ──────────────────────────────────────────

config/
  axios.ts                           # Axios instance with JWT interceptor + 401 auto-logout

data/
  index.ts                           # Barrel export — APP_NAME, APP_DESCRIPTION, constants
  menu.ts                            # SIDEBAR_MENU, PROFILE_MENU
  vehicle-constants.ts               # Vehicle types, cost categories, status enums, payment modes

hooks/                               # Shared React Query hooks (use-{entities}.ts)
  use-lenders.ts                     # Phase 1 — lender hooks
  use-investments.ts
  use-repayments.ts
  use-summary.ts
  use-vehicles.ts                    # Phase 2 — vehicle hooks
  use-vehicle-costs.ts
  use-vehicle-payments.ts
  use-vehicle-documents.ts
  use-consignments.ts                # Phase 3 — consignment hooks
  use-consignment-payments.ts
  use-vehicle-owners.ts
  use-consignment-reports.ts

lib/
  auth.ts                            # getClientSession, setClientSession, clearClientSession
  formatApiErrors.ts                 # Format AxiosError → human-readable string
  getToken.ts                        # Server-side access token from cookies
  getServerSession.ts                # Server-side session decode from JWT
  utils.ts                           # cn() utility (clsx + tailwind-merge)
  currency.ts                        # INR formatting (₹12,34,567.00) — Indian number system
  date.ts                            # Date formatting utilities (date-fns)

providers/
  AppProvider.tsx                    # ThemeProvider + QueryClientProvider + Toaster

schemas/                             # Zod validation schemas
  login.ts
  lender.ts
  investment.ts
  repayment.ts
  vehicle.ts
  vehicle-cost.ts
  vehicle-payment.ts
  consignment.ts
  consignment-payment.ts
  vehicle-owner.ts
  profile.ts

services/                            # Server-side fetch functions shared across 2+ pages

stores/
  session.ts                         # Zustand auth session store (persisted)

types/                               # Global ambient *.d.ts declarations
  ApiResponse.d.ts                   # ApiResponse<T>, PaginatedData<T>, ErrorData, ApiErrorResponse
  AuthSession.d.ts
  Token.d.ts
  User.d.ts
  Lender.d.ts                        # Phase 1
  Investment.d.ts
  Repayment.d.ts
  LenderSummary.d.ts
  Vehicle.d.ts                        # Phase 2
  VehicleCost.d.ts
  VehiclePayment.d.ts
  ConsignmentVehicle.d.ts             # Phase 3
  ConsignmentPayment.d.ts
  VehicleOwner.d.ts
  Dashboard.d.ts
  MenuItem.d.ts
  Profile.d.ts
```

## 5. Architecture

Next.js 15 App Router + React 19 + TypeScript strict mode.

### Route Groups

- `app/(auth)/` — Login page (public, no layout chrome)
- `app/(dashboard)/` — All protected pages (sidebar + navbar injected via layout.tsx)

### Data Flow

- **Server components** (`page.tsx`) fetch initial data using `getToken()` + `axios` with manual `Authorization` header, pass as `initialData` prop to client components
- **Client components** pass `initialData` into `useQuery({ initialData })` — this hydrates React Query's cache on first render, then React Query manages background refetching and cache invalidation automatically
- **Mutations** call `queryClient.invalidateQueries({ queryKey })` on success — the matching `useQuery` refetches fresh data without manual state updates
- **Zustand** (`stores/session.ts`) holds decoded auth session client-side with localStorage persistence

### Auth

JWT tokens stored in cookies via `js-cookie`. Decoded client-side with `jwt-decode`. Server-side token read via `lib/getToken.ts` (uses `next/headers`). Single admin user — shop owner is the sole user.

### Middleware

`middleware.ts` at the root handles:
- Token expiry check → attempt refresh via `/api/v1/auth/refresh`
- Auth routes while logged in → redirect to `/dashboard`
- Private routes while logged out → redirect to `/auth/login?callbackUrl=...`

## 6. Path Aliases

Configured in `tsconfig.json`:

```
@components  →  components/
@lib         →  lib/
@config      →  config/
@hooks       →  hooks/
@data        →  data/index  (barrel export)
@data/*      →  data/*
@services    →  services/
@stores      →  stores/
@schemas     →  schemas/
@providers   →  providers/
```

## 7. Environment Variables

```
NEXT_PUBLIC_URL      # Frontend base URL (e.g. http://localhost:3000)
NEXT_PUBLIC_API_URL  # Backend API base URL (e.g. http://localhost:5000/api/v1)
```

## 8. API Standards

Backend returns envelope format:

```json
{ "success": true, "statusCode": 200, "message": "...", "data": { ... }, "meta": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 } }
{ "success": false, "statusCode": 400, "message": "Validation failed", "errors": [{ "field": "name", "message": "..." }] }
```

### API Prefixes

| Phase | Prefix | Examples |
|-------|--------|----------|
| Auth | `/api/v1/auth` | `/login`, `/refresh`, `/logout` |
| Phase 1 | `/api/v1/lenders`, `/api/v1/investments`, `/api/v1/repayments`, `/api/v1/summary` | CRUD + aggregation |
| Phase 2 | `/api/v1/vehicles` | CRUD + `/costs`, `/sale`, `/sale-payments`, `/purchase-payments`, `/documents` |
| Phase 3 | `/api/v1/consignments`, `/api/v1/vehicle-owners` | CRUD + `/costs`, `/buyer-payments`, `/payee-payments`, `/sale`, `/documents` |

## 9. Key Patterns

### Barrel export (`components/index.ts`)

Every `components/` folder must have an `index.ts` that uses **named imports + single export statement**. All components in the folder are registered here, and cross-imports within the folder use `from "."`.

```ts
// components/index.ts
import EntityList from "./entity-list";
import EntityCard from "./entity-card";
import CreateEntityDialog from "./create-entity-dialog";
import DeleteEntityDialog from "./delete-entity-dialog";

export { EntityList, EntityCard, CreateEntityDialog, DeleteEntityDialog };
```

```ts
// page.tsx — imports via barrel
import { EntityList } from "./components";

// components/entity-list.tsx — cross-imports within the folder also use the barrel
import { EntityCard, CreateEntityDialog } from ".";
```

**Never** use `export { default as X } from "./x"` — always import first, then export.

---

### New route/page

`page.tsx` (server component) + `components/` folder with `index.ts` barrel export:

```tsx
// page.tsx — server component (SSR fetch)
import axios from "@config/axios";
import { AxiosError } from "axios";
import { getToken } from "@lib/getToken";
import { Metadata } from "next";
import { APP_NAME } from "@data";
import { EntityList } from "./components";

export const metadata: Metadata = { title: `${APP_NAME} | Entities` };

const EntityPage = async () => {
    const initialData = await fetchEntities();
    return (
        <section className="flex w-full flex-col pb-2">
            <EntityList initialData={initialData} />
        </section>
    );
};
export default EntityPage;

const fetchEntities = async (): Promise<EntityPaginatedData | null> => {
    const token = await getToken();
    try {
        const response = await axios.get<EntitiesResponse>("/endpoint/", {
            headers: { Authorization: `Bearer ${token}` },
            params: { page: 1, limit: 10 },
        });
        return response?.data?.data ?? null;
    } catch (error: unknown) {
        const errorData = (error as AxiosError)?.response?.data as ErrorData;
        console.error("Error fetching:", errorData?.message);
        return null;
    }
};
```

### Client component with `useQuery + initialData` (REQUIRED pattern)

**Never use `useState` to hold server-fetched data. Always hydrate React Query:**

`queryFn` must **always** reference a named function defined at module scope above the component. Never use an inline `async () => {}`. If the query depends on a runtime value (e.g. a selected ID), define the function to accept it as a parameter and wrap the call with an arrow function in `queryFn`.

**Never add `try/catch` inside a `queryFn` function.** React Query must receive the thrown error to set `isError` and `error` correctly. Swallowing the error with `try/catch` causes silent failures. Server-side fetch functions in `page.tsx` are the only place that use `try/catch`.

```tsx
// components/entity-list.tsx — client component
"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "@config/axios";

type EntityListProps = {
    initialData: EntityPaginatedData | null;
};

// ✅ Named function at module scope — no inline async in queryFn
const fetchEntities = async (): Promise<EntityPaginatedData | null> => {
    const response = await axios.get<EntitiesResponse>("/endpoint/", {
        params: { page: 1, limit: 10 },
    });
    return response.data.data ?? null;
};

const EntityList = ({ initialData }: EntityListProps) => {
    const { data } = useQuery<EntityPaginatedData | null>({
        queryKey: ["entities"],
        queryFn: fetchEntities,
        initialData,   // ← hydrates cache from SSR, no loading flash
        retry: 0,
    });

    // ... render
};

// ✅ When queryFn depends on a runtime param (e.g. selected ID):
const fetchEntityById = async (id: string): Promise<Entity | null> => {
    const res = await axios.get<EntityResponse>(`/endpoint/${id}/`);
    return res.data.data ?? null;
};

// Inside the component:
// queryFn: () => fetchEntityById(selectedId!),   // ← thin wrapper, logic stays in named fn
```

After mutations, call `queryClient.invalidateQueries({ queryKey: ["entities"] })` — the list refetches automatically. No manual `setState` needed.

### `useMutation` — named function pattern (REQUIRED)

`mutationFn` must **always** reference a named function defined above `useMutation`. Never use an inline `async () => {}`.

**Naming convention:** when `mutate` is aliased (e.g. `mutate: deleteLender`), name the extracted function `<action>Request` (e.g. `deleteLenderRequest`) to avoid a name clash.

The loading toast (`toast.loading(…)`) is called **inside the mutation function**, before the `axios` call.

---

### Create Dialog — full reference pattern (REQUIRED)

Every create/edit dialog must follow this exact structure. This example shows `CreateLenderDialog` — adapt for any entity.

```tsx
// components/create-lender-dialog.tsx
"use client";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { ScrollArea } from "@components/ui/scroll-area";
import { createLenderSchema } from "@schemas/lender";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, X, Plus, Phone, MapPin, Sparkles, Loader2 } from "lucide-react";
import { Form, FormItem, FormField, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const CreateLenderDialog = () => {
    const [open, setOpen] = useState(false);
    const [onAddToast, setOnAddToast] = useState<string | number>();

    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(createLenderSchema),
        defaultValues: {
            name: "",
            phone: "",
            address: "",
            remarks: "",
        },
    });

    // ✅ Named function — toast.loading INSIDE, before axios call
    const createLenderRequest = async (values: z.infer<typeof createLenderSchema>) => {
        setOnAddToast(toast.loading("Creating…", { description: "Please wait while we add the lender!" }));
        const payload = {
            name: values?.name,
            phone: values?.phone,
            address: values?.address,
            remarks: values?.remarks,
        };
        return await axios.post("/lenders", payload);
    };

    const { mutate, isPending } = useMutation({
        mutationFn: createLenderRequest,
        onSuccess: async () => {
            toast.success("Success!", { id: onAddToast, description: "Lender created successfully!" });
            queryClient.invalidateQueries({ queryKey: ["lenders"] });
            queryClient.invalidateQueries({ queryKey: ["lender-summary"] });
            form.reset();
            setOpen(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            const fieldErrors = formatApiErrors(errorData?.errors);
            const errorMessage = fieldErrors || errorData?.message || "An error occurred!";
            toast.error("Error!", { id: onAddToast, description: errorMessage });
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen} aria-hidden={!open}>
            <DialogTrigger asChild>
                <Button className="bg-gradient-brand cursor-pointer text-white shadow-lg hover:opacity-90">
                    <Plus size={18} className="mr-2" />
                    Add Lender
                </Button>
            </DialogTrigger>
            <DialogContent
                onOpenAutoFocus={event => event.preventDefault()}
                aria-label="Create Lender Dialog"
                className={cn("overflow-hidden p-0 sm:max-w-lg", "bg-card border-border")}
            >
                {/* ─── Gradient Header (shrink-0, never scrolls) ─── */}
                <div className="bg-gradient-brand relative p-4 sm:p-6">
                    <div className="absolute -top-10 -right-10 h-24 w-24 rounded-full bg-white/15 blur-2xl sm:h-32 sm:w-32" />
                    <div className="absolute -bottom-10 -left-10 h-24 w-24 rounded-full bg-white/15 blur-2xl sm:h-32 sm:w-32" />

                    <div className="relative flex items-center gap-3 sm:gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-lg backdrop-blur-sm sm:h-14 sm:w-14 sm:rounded-xl">
                            <Users className="h-5 w-5 text-white sm:h-7 sm:w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5 sm:mb-1 sm:gap-2">
                                <Sparkles className="h-3 w-3 text-white/70 sm:h-4 sm:w-4" />
                                <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase sm:text-xs">
                                    New
                                </span>
                            </div>
                            <DialogTitle className="m-0 text-lg font-bold text-white sm:text-2xl">
                                Add Lender
                            </DialogTitle>
                            <DialogDescription className="mt-0.5 hidden text-xs text-white/70 sm:mt-1 sm:block sm:text-sm">
                                Fill in the details to register a new investor
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                {/* ─── Form ─── */}
                <Form {...form}>
                    <form
                        id="create-lender-form"
                        onSubmit={form.handleSubmit(values => mutate(values))}
                        className="flex w-full flex-1 flex-col"
                    >
                        {/* ─── Scrollable Body ─── */}
                        <ScrollArea className="max-h-[60vh] w-full sm:max-h-[400px]">
                            <div className="space-y-4 p-4 sm:space-y-5 sm:p-6">

                                {/* Field with icon prefix */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground font-semibold">
                                                Lender Name <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                                        <Users size={18} />
                                                    </div>
                                                    <Input
                                                        placeholder="Enter lender name"
                                                        className={cn(
                                                            "h-10 rounded-lg pl-10 sm:h-12",
                                                            "bg-muted/50 border-border",
                                                            "focus-visible:ring-ring focus-visible:border-primary",
                                                            "placeholder:text-muted-foreground"
                                                        )}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-destructive" />
                                        </FormItem>
                                    )}
                                />

                                {/* Phone field */}
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground font-semibold">Phone</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                                        <Phone size={18} />
                                                    </div>
                                                    <Input
                                                        placeholder="+91 1234 567890"
                                                        className={cn(
                                                            "h-10 rounded-lg pl-10 sm:h-12",
                                                            "bg-muted/50 border-border",
                                                            "focus-visible:ring-ring focus-visible:border-primary",
                                                            "placeholder:text-muted-foreground"
                                                        )}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-destructive" />
                                        </FormItem>
                                    )}
                                />

                                {/* Textarea field with icon */}
                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-foreground font-semibold">Address</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="text-muted-foreground absolute top-3 left-3">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <Textarea
                                                        placeholder="Enter address"
                                                        rows={3}
                                                        className={cn(
                                                            "resize-none rounded-lg pt-3 pl-10",
                                                            "bg-muted/50 border-border",
                                                            "focus-visible:ring-ring focus-visible:border-primary",
                                                            "placeholder:text-muted-foreground"
                                                        )}
                                                        {...field}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-destructive" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </ScrollArea>

                        {/* ─── Sticky Footer (shrink-0, never scrolls away) ─── */}
                        <div className="border-border bg-muted/30 border-t p-4 pt-3 sm:p-6 sm:pt-4">
                            <div className="flex flex-col-reverse items-stretch justify-end gap-2 sm:flex-row sm:items-center sm:gap-3">
                                <Button
                                    disabled={isPending}
                                    type="button"
                                    variant="outline"
                                    onClick={() => setOpen(false)}
                                    className={cn("cursor-pointer", "border-border text-foreground", "hover:bg-muted")}
                                >
                                    <X size={18} className="mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    disabled={isPending}
                                    type="submit"
                                    form="create-lender-form"
                                    className={cn("cursor-pointer", "bg-gradient-brand text-white", "shadow-md hover:opacity-90")}
                                >
                                    {isPending ? (
                                        <>
                                            <Loader2 size={18} className="mr-2 animate-spin" />
                                            Creating…
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} className="mr-2" />
                                            Add Lender
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateLenderDialog;
```

**Dialog structure rules:**

| Section | Class | Behavior |
|---------|-------|----------|
| `DialogContent` | `overflow-hidden p-0 sm:max-w-lg bg-card border-border` | No padding, overflow hidden |
| Gradient header | `bg-gradient-brand relative p-4 sm:p-6` | Decorative blur circles, icon + title + subtitle |
| Form body | `<ScrollArea className="max-h-[60vh] sm:max-h-[400px]">` | Scrollable, respects viewport |
| Sticky footer | `border-t bg-muted/30 p-4 pt-3 sm:p-6 sm:pt-4` | Always visible at bottom |
| Cancel button | `variant="outline"` with `<X />` icon | Left on desktop, bottom on mobile |
| Submit button | `bg-gradient-brand text-white` with loading spinner | Right on desktop, top on mobile |

**Input field with icon prefix:**
```tsx
<div className="relative">
    <div className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
        <IconComponent size={18} />
    </div>
    <Input className={cn("h-10 rounded-lg pl-10 sm:h-12", "bg-muted/50 border-border")} {...field} />
</div>
```

**Textarea with icon prefix** (icon is `top-3` instead of centered):
```tsx
<div className="relative">
    <div className="text-muted-foreground absolute top-3 left-3">
        <MapPin size={18} />
    </div>
    <Textarea className={cn("resize-none rounded-lg pt-3 pl-10", "bg-muted/50 border-border")} {...field} />
</div>
```

---

### Delete Dialog pattern (REQUIRED)

```tsx
// components/delete-lender-dialog.tsx
"use client";
import { useState } from "react";
import axios from "@config/axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { formatApiErrors } from "@/lib/formatApiErrors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import {
    AlertDialog, AlertDialogContent, AlertDialogTitle,
    AlertDialogDescription, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

type DeleteLenderDialogProps = {
    lender: ILender;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

const DeleteLenderDialog = ({ lender, open, onOpenChange }: DeleteLenderDialogProps) => {
    const [deleteToast, setDeleteToast] = useState<string | number>();
    const queryClient = useQueryClient();

    const deleteLenderRequest = async () => {
        setDeleteToast(toast.loading("Deleting…", { description: "Please wait." }));
        return await axios.delete(`/lenders/${lender._id}`);
    };

    const { mutate: deleteLender, isPending } = useMutation({
        mutationFn: deleteLenderRequest,
        onSuccess: () => {
            toast.success("Deleted!", { id: deleteToast, description: `${lender.name} has been removed.` });
            queryClient.invalidateQueries({ queryKey: ["lenders"] });
            onOpenChange(false);
        },
        onError: (error: unknown) => {
            const errorData = (error as AxiosError)?.response?.data as ErrorData;
            const errorMessage = formatApiErrors(errorData?.errors) || errorData?.message || "Failed to delete!";
            toast.error("Error!", { id: deleteToast, description: errorMessage });
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className={cn("bg-card border-border sm:max-w-md")}>
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <div>
                        <AlertDialogTitle className="text-foreground text-lg font-bold">
                            Delete "{lender.name}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2 text-sm">
                            This action cannot be undone. All investments and repayments linked to this lender will remain intact.
                        </AlertDialogDescription>
                    </div>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                    <AlertDialogCancel disabled={isPending} className="cursor-pointer">
                        <X size={16} className="mr-2" /> Cancel
                    </AlertDialogCancel>
                    <Button
                        disabled={isPending}
                        variant="destructive"
                        onClick={() => deleteLender()}
                        className="cursor-pointer"
                    >
                        {isPending ? (
                            <><Loader2 size={16} className="mr-2 animate-spin" /> Deleting…</>
                        ) : (
                            <><Trash2 size={16} className="mr-2" /> Delete</>
                        )}
                    </Button>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteLenderDialog;
```

---

### Toast patterns (REQUIRED)

Use `sonner` for all toast notifications. **Loading → Success/Error** pattern with toast ID for seamless transitions:

```tsx
import { toast } from "sonner";

// ─── Loading → Success (seamless transition, same toast updates) ───
const [toastId, setToastId] = useState<string | number>();

// In mutation function:
setToastId(toast.loading("Creating…", { description: "Please wait." }));

// In onSuccess:
toast.success("Success!", { id: toastId, description: "Lender created!" });

// In onError:
toast.error("Error!", { id: toastId, description: errorMessage });

// ─── Simple toasts (no loading state needed) ───
toast.success("Copied!", { description: "ID copied to clipboard." });
toast.error("Failed!", { description: "Something went wrong." });
toast.info("Note", { description: "This lender has pending repayments." });
toast.warning("Warning!", { description: "Outstanding balance is ₹24,69,400." });
```

**Rules:**
- Always use `toast.loading()` inside the `mutationFn`, never in `onMutate`
- Store toast ID in state so `onSuccess`/`onError` can update the **same toast**
- Every toast must have `description` — never show just a title
- Use `id: toastId` in success/error to **replace** the loading toast (no duplicate)

---

### Barrel export — completeness rules

Every file in a `components/` folder **must** be listed in `index.ts`. Missing entries cause the component to be a dead/unreachable file.

Multiple items imported from the same barrel must be in a **single** import statement per file:

```ts
// ✅ CORRECT
import { EntityList, CreateEntityDialog, DeleteEntityDialog } from ".";

// ❌ WRONG — split imports from the same barrel
import { EntityList } from ".";
import { CreateEntityDialog } from ".";
```

---

### Sub-components — define at module scope

Never define a component inside another component's function body. It causes remounting on every parent render.

```tsx
// ✅ CORRECT — at module scope, above the parent component
const Sparkline = ({ data }: { data: number[] }) => { ... };

const ParentComponent = () => { ... };

// ❌ WRONG — inside the parent body
const ParentComponent = () => {
    const Sparkline = ({ data }) => { ... }; // remounts every render
    return <Sparkline data={...} />;
};
```

---

### Currency formatting — Indian number system (REQUIRED)

All amounts MUST use the Indian number system (₹12,34,567) via the shared `currency.ts` utility. Never use `toLocaleString('en-US')`.

```tsx
// ✅ CORRECT
import { formatINR } from "@lib/currency";
<span>{formatINR(1234567)}</span>  // → ₹12,34,567

// ❌ WRONG — US number system
<span>₹{amount.toLocaleString()}</span>
```

---

### React Query — consistent query keys

Components that share the same data **must** use the same `queryKey`. Mismatched keys create duplicate fetches and prevent cache sharing.

Standard query key patterns:

```tsx
// Phase 1
["lenders"]                    // All lenders
["lender", lenderId]           // Single lender detail
["investments"]                // All investments
["investments", lenderId]      // Investments for a lender
["repayments"]                 // All repayments
["repayments", lenderId]       // Repayments for a lender
["lender-summary"]             // Summary dashboard

// Phase 2
["vehicles"]                   // All vehicles
["vehicle", vehicleId]         // Single vehicle detail
["vehicle-costs", vehicleId]   // Costs for a vehicle
["vehicle-payments", vehicleId] // Payments for a vehicle
["vehicle-reports"]            // Reports

// Phase 3
["consignments"]               // All consignment vehicles
["consignment", consignmentId] // Single consignment detail
["buyer-payments", id]         // Buyer payments for a consignment
["payee-payments", id]         // Payee payments for a consignment
["vehicle-owners"]             // All owners
["vehicle-owner", ownerId]     // Single owner detail
["consignment-reports"]        // Reports
```

---

### Shared hook

Only create when data is fetched in 2+ client components:

```
hooks/use-{entities}.ts
```

### New type

```
types/{Entity}.d.ts  — ambient declarations, no export keyword needed
```

### New Zod schema

```
schemas/{entity}.ts  — export schema + export type = z.infer<typeof schema>
```

## 10. Design System

### Identity

VehicleBook is a **business management dashboard** — not a consumer app. The design must feel:
- **Authoritative** — shop owner trusts it with real money
- **Data-dense** — lots of numbers, tables, stats visible at once
- **Clean** — no clutter despite data density
- **Automotive** — subtle nods to vehicles without being cartoonish

### Color Palette — CSS Variables (`globals.css`)

Dark mode is default. Colors use HSL for easy theming.

```css
@layer base {
  :root {
    /* ─── Base ─── */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 47%;
    --border: 214 32% 91%;
    --input: 214 32% 91%;
    --ring: 222 47% 31%;

    /* ─── Brand ─── */
    --primary: 222 47% 31%;           /* Deep navy */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222 47% 11%;
    --accent: 38 92% 50%;             /* Amber gold */
    --accent-foreground: 0 0% 100%;

    /* ─── Semantic ─── */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 76% 36%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;

    --radius: 0.625rem;
  }

  .dark {
    /* ─── Base ─── */
    --background: 222 47% 6%;         /* Near black with blue tint */
    --foreground: 210 40% 98%;
    --card: 222 47% 9%;               /* Slightly elevated from bg */
    --card-foreground: 210 40% 98%;
    --popover: 222 47% 9%;
    --popover-foreground: 210 40% 98%;
    --muted: 217 33% 15%;
    --muted-foreground: 215 20% 55%;
    --border: 217 33% 17%;
    --input: 217 33% 17%;
    --ring: 217 91% 60%;

    /* ─── Brand ─── */
    --primary: 217 91% 60%;           /* Vivid blue */
    --primary-foreground: 0 0% 100%;
    --secondary: 217 33% 15%;
    --secondary-foreground: 210 40% 98%;
    --accent: 38 92% 50%;             /* Amber gold */
    --accent-foreground: 0 0% 100%;

    /* ─── Semantic ─── */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --success: 142 71% 45%;
    --success-foreground: 0 0% 100%;
    --warning: 38 92% 50%;
    --warning-foreground: 0 0% 100%;
    --info: 217 91% 60%;
    --info-foreground: 0 0% 100%;
  }
}
```

### Gradient Classes (`globals.css`)

```css
@layer utilities {
  /* Primary brand gradient — dialog headers, primary CTAs */
  .bg-gradient-brand {
    background: linear-gradient(135deg, hsl(217, 91%, 55%) 0%, hsl(262, 83%, 58%) 100%);
  }

  /* Success gradient — profit indicators, completed states */
  .bg-gradient-success {
    background: linear-gradient(135deg, hsl(142, 71%, 40%) 0%, hsl(160, 84%, 39%) 100%);
  }

  /* Warning gradient — pending states, balance alerts */
  .bg-gradient-warning {
    background: linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(25, 95%, 53%) 100%);
  }

  /* Danger gradient — loss indicators, overdue */
  .bg-gradient-danger {
    background: linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(350, 89%, 60%) 100%);
  }

  /* Subtle card hover glow */
  .card-hover-glow {
    @apply transition-all duration-200;
  }
  .card-hover-glow:hover {
    box-shadow: 0 0 0 1px hsl(var(--primary) / 0.3), 0 4px 12px hsl(var(--primary) / 0.1);
  }

  /* Monospace for IDs and amounts */
  .font-mono-id {
    @apply font-mono text-xs tracking-wider;
  }
}
```

### Typography

| Element | Font | Weight | Size |
|---------|------|--------|------|
| Body text | `Inter` | 400 | 14px |
| Headings (h1-h3) | `Inter` | 700 | 24/20/16px |
| IDs (L001, VH-00001) | `JetBrains Mono` | 500 | 12px |
| Amounts (₹) | `JetBrains Mono` | 600 | 14px |
| Table data | `Inter` | 400 | 13px |
| Stat numbers | `JetBrains Mono` | 700 | 28px |
| Badges | `Inter` | 600 | 11px |

```tsx
// Google Fonts — import in layout.tsx
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

### Component Patterns

#### Stat Card (Dashboard, Summary pages)

```tsx
<Card className="bg-card border-border group relative overflow-hidden transition-all hover:border-primary/30">
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                    Total Borrowed
                </p>
                <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                    {formatINR(totalBorrowed)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                    From <span className="text-foreground font-medium">12</span> lenders
                </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TrendingUp className="h-6 w-6" />
            </div>
        </div>
    </CardContent>
</Card>
```

#### Data Table Row

```tsx
<TableRow className="border-border hover:bg-muted/50 transition-colors">
    <TableCell className="font-mono-id text-primary">{lender.lenderId}</TableCell>
    <TableCell className="font-medium">{lender.name}</TableCell>
    <TableCell className="font-mono text-sm text-right">{formatINR(lender.totalBorrowed)}</TableCell>
    <TableCell className="font-mono text-sm text-right text-success">{formatINR(lender.totalRepaid)}</TableCell>
    <TableCell className="font-mono text-sm text-right font-bold">
        <span className={cn(
            lender.balancePayable > 0 ? "text-warning" : "text-success"
        )}>
            {formatINR(lender.balancePayable)}
        </span>
    </TableCell>
    <TableCell>
        <StatusBadge status={lender.isActive ? "active" : "inactive"} />
    </TableCell>
</TableRow>
```

#### Status Badge

```tsx
const statusConfig = {
    in_stock:       { label: "In Stock",       class: "bg-success/10 text-success border-success/20" },
    reconditioning: { label: "Reconditioning", class: "bg-warning/10 text-warning border-warning/20" },
    ready_for_sale: { label: "Ready for Sale", class: "bg-info/10 text-info border-info/20" },
    sold:           { label: "Sold",           class: "bg-primary/10 text-primary border-primary/20" },
    sold_pending:   { label: "Sold Pending",   class: "bg-warning/10 text-warning border-warning/20" },
    returned:       { label: "Returned",       class: "bg-muted text-muted-foreground border-border" },
    fully_closed:   { label: "Fully Closed",   class: "bg-success/10 text-success border-success/20" },
};

<Badge variant="outline" className={cn("text-[11px] font-semibold border px-2 py-0.5", statusConfig[status].class)}>
    {statusConfig[status].label}
</Badge>
```

#### Profit/Loss Display

```tsx
{/* Green for profit, red for loss — always mono */}
<div className={cn(
    "inline-flex items-center gap-1 font-mono text-sm font-bold",
    profitLoss >= 0 ? "text-success" : "text-destructive"
)}>
    {profitLoss >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
    {formatINR(Math.abs(profitLoss))}
</div>
```

#### Page Header

```tsx
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
        <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">Lenders</h1>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">Manage investor relationships and track capital</p>
    </div>
    <CreateLenderDialog />
</div>
```

#### Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
        <Users className="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 className="text-foreground text-lg font-semibold">No lenders yet</h3>
    <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        Add your first investor to start tracking capital and repayments.
    </p>
    <CreateLenderDialog className="mt-6" />
</div>
```

### Sidebar Design

```tsx
{/* Sidebar — deep navy, collapsible */}
<aside className={cn(
    "flex h-screen flex-col border-r border-border bg-card",
    collapsed ? "w-16" : "w-64",
    "transition-all duration-200"
)}>
    {/* Logo */}
    <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand">
            <Car className="h-5 w-5 text-white" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-foreground">VehicleBook</span>}
    </div>

    {/* Phase Groups */}
    <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Phase label */}
        {!collapsed && (
            <p className="text-muted-foreground mb-2 mt-4 px-3 text-[10px] font-bold uppercase tracking-widest">
                Investors
            </p>
        )}
        {/* Menu items */}
        <SidebarItem icon={Users} label="Lenders" href="/lenders" active={pathname === '/lenders'} collapsed={collapsed} />
        <SidebarItem icon={ArrowDownLeft} label="Investments" href="/investments" active={...} collapsed={collapsed} />
        <SidebarItem icon={ArrowUpRight} label="Repayments" href="/repayments" active={...} collapsed={collapsed} />
    </nav>
</aside>
```

### Chart Colors

For Recharts/Chart.js:

```ts
const chartColors = {
    primary: "hsl(217, 91%, 60%)",     // Blue — main data
    secondary: "hsl(262, 83%, 58%)",   // Purple — comparison
    success: "hsl(142, 71%, 45%)",     // Green — profit/positive
    warning: "hsl(38, 92%, 50%)",      // Amber — pending/warning
    danger: "hsl(0, 84%, 60%)",        // Red — loss/negative
    muted: "hsl(215, 20%, 55%)",       // Gray — background data
    accent: "hsl(160, 84%, 39%)",      // Teal — tertiary
};
```

### Responsive Breakpoints

| Breakpoint | Usage |
|------------|-------|
| `sm` (640px) | Stack to row, padding adjustments |
| `md` (768px) | Sidebar visible, 2-column grid |
| `lg` (1024px) | 3-column grid, wide tables |
| `xl` (1280px) | 4-column stat grid, full dashboard |

### Spacing Scale

- **Page padding**: `p-4 sm:p-6 lg:p-8`
- **Card padding**: `p-4 sm:p-5`
- **Section gap**: `space-y-6`
- **Card grid gap**: `gap-4 sm:gap-6`
- **Form field gap**: `space-y-4 sm:space-y-5`

## 11. Code Style

- Tabs, width 4 (`.prettierrc.json`)
- Print width 250
- Arrow parens: avoid
- `prettier-plugin-tailwindcss` for class sorting
- Shadcn/ui components from `components/ui/` — install via `npx shadcn@latest add`
- Icons: `lucide-react`
- Toast: `sonner` via `toast.success()` / `toast.error()`
- Conditional classes: `cn()` from `@lib/utils`
- Monospace: `JetBrains Mono` for IDs (L001, VH-00001, CS-00001) and amounts
- Font: `Inter` from Google Fonts

## 12. Domain-Specific Conventions

### Vehicle IDs — monospace display

All auto-generated IDs use monospace font:
- Lender: `L001`, `L002`
- Vehicle: `VH-00001`
- Consignment: `CS-00001`
- Vehicle Owner: `OWN-001`
- Investment: `INV-00001`
- Repayment: `REP-00001`

### Payment modes

Standard payment modes across all phases:
```ts
type PaymentMode = 'Cash' | 'Online' | 'Cheque' | 'UPI' | 'GPay' | 'Finance' | 'Bank Transfer';
```

### Vehicle types

```ts
type VehicleType = 'two_wheeler' | 'four_wheeler';
```

### Status colors

| Status | CSS Class | Usage |
|--------|-----------|-------|
| In Stock / In Shop / Received | `bg-success/10 text-success border-success/20` | Available |
| Reconditioning | `bg-warning/10 text-warning border-warning/20` | In progress |
| Ready for Sale | `bg-info/10 text-info border-info/20` | Ready |
| Sold | `bg-primary/10 text-primary border-primary/20` | Completed |
| Sold Pending / Balance | `bg-warning/10 text-warning border-warning/20` | Needs attention |
| Returned / Exchanged | `bg-muted text-muted-foreground border-border` | Inactive |
| Fully Closed | `bg-success/10 text-success border-success/20` | All settled |

### Settlement status colors

| Status | CSS Class | Icon |
|--------|-----------|------|
| Open | `bg-info/10 text-info` | `Clock` |
| Buyer Settled | `bg-warning/10 text-warning` | `CheckCircle` |
| Payee Settled | `bg-warning/10 text-warning` | `CheckCircle` |
| Fully Closed | `bg-success/10 text-success` | `CheckCheck` |

### Amount color coding

```tsx
// Positive amounts (received, profit) → green
<span className="text-success font-mono">{formatINR(amount)}</span>

// Negative amounts (paid, loss) → red
<span className="text-destructive font-mono">{formatINR(amount)}</span>

// Pending/Balance → amber
<span className="text-warning font-mono">{formatINR(amount)}</span>

// Neutral → default foreground
<span className="text-foreground font-mono">{formatINR(amount)}</span>
```

### Exchange vehicle — shared component

The `exchange-vehicle/` component folder is **shared** between Phase 2 (sale payments) and Phase 3 (buyer payments). When recording a payment with `type: 'exchange'`, the `ExchangeCreateModal` is triggered. It lives in `components/exchange-vehicle/` (top-level, not inside a route).
