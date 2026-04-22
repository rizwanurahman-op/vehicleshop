# CLAUDE.md — VehicleBook (Backend)

## 1. Project Overview

VehicleBook backend — Express.js REST API for vehicle shop management. Serves the Next.js frontend. MongoDB database with Mongoose ODM.

### API Modules

| Prefix | Phase | Description |
|--------|-------|-------------|
| `/api/v1/auth` | — | Authentication (register, login, refresh, logout) |
| `/api/v1/lenders` | 1 | Lender/Investor CRUD |
| `/api/v1/investments` | 1 | Investment register (money received from lenders) |
| `/api/v1/repayments` | 1 | Repayment register (money paid back to lenders) |
| `/api/v1/summary` | 1 | Lender summary (aggregation pipelines) |
| `/api/v1/vehicles` | 2 | Vehicle CRUD + sub-routes for costs, payments, sale, documents |
| `/api/v1/consignments` | 3 | Consignment vehicle CRUD + buyer/payee payments, sale, documents |
| `/api/v1/vehicle-owners` | 3 | Vehicle owner registry |

## 2. Commands

```bash
npm run dev        # Start dev server with nodemon (http://localhost:5000)
npm run build      # TypeScript compile
npm run start      # Start production server
npm run test       # Jest unit tests
npm run test:int   # Supertest integration tests
npm run lint       # ESLint
```

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x (strict mode) |
| Database | MongoDB 7+ via Mongoose 8.x |
| Auth | JWT (access + refresh tokens, bcrypt) |
| Validation | Zod |
| Security | Helmet, CORS, express-rate-limit, express-mongo-sanitize, xss-clean |
| Date | date-fns |
| File Upload | Cloudinary |

## 4. Folder Structure

```
backend/src/
├── config/
│   ├── db.ts                    # MongoDB connection with retry logic
│   ├── env.ts                   # Environment variable validation (Zod)
│   └── cors.ts                  # CORS configuration
├── middleware/
│   ├── auth.middleware.ts       # JWT verification middleware
│   ├── validate.middleware.ts   # Zod schema validation middleware
│   ├── error.middleware.ts      # Global error handler
│   ├── rate-limit.middleware.ts # Rate limiting per route
│   └── logger.middleware.ts     # Request logging (pino)
├── models/
│   ├── user.model.ts            # Admin user
│   ├── counter.model.ts         # Auto-ID generation
│   ├── lender.model.ts          # Phase 1
│   ├── investment.model.ts
│   ├── repayment.model.ts
│   ├── vehicle.model.ts         # Phase 2
│   ├── consignment-vehicle.model.ts  # Phase 3
│   └── vehicle-owner.model.ts
├── routes/
│   ├── auth.routes.ts
│   ├── lender.routes.ts
│   ├── investment.routes.ts
│   ├── repayment.routes.ts
│   ├── summary.routes.ts
│   ├── vehicle.routes.ts
│   ├── vehicle-cost.routes.ts
│   ├── vehicle-sale.routes.ts
│   ├── vehicle-payment.routes.ts
│   ├── vehicle-document.routes.ts
│   ├── vehicle-report.routes.ts
│   ├── consignment.routes.ts
│   ├── consignment-cost.routes.ts
│   ├── consignment-sale.routes.ts
│   ├── consignment-buyer-payment.routes.ts
│   ├── consignment-payee-payment.routes.ts
│   ├── consignment-document.routes.ts
│   ├── consignment-report.routes.ts
│   └── vehicle-owner.routes.ts
├── controllers/               # Mirror routes — thin, delegates to services
├── services/                  # Business logic, DB queries, auto-calculations
│   ├── counter.service.ts     # Auto-ID generation (L001, VH-00001, CS-00001)
│   ├── exchange-vehicle.service.ts  # SHARED — exchange auto-creation logic
│   └── ...
├── schemas/                   # Zod validation schemas for request bodies
├── utils/
│   ├── api-response.ts        # Standardized response format
│   ├── api-error.ts           # Custom error classes
│   ├── currency.ts            # INR formatting utilities
│   └── pagination.ts          # Pagination helper
├── types/
│   └── index.ts               # TypeScript interfaces & types
└── app.ts                     # Express app setup
```

## 5. API Response Format

```typescript
// Success
{
  success: true,
  statusCode: 200,
  message: "Lenders fetched successfully",
  data: { ... },
  meta: {
    page: 1,
    limit: 10,
    total: 45,
    totalPages: 5
  }
}

// Error
{
  success: false,
  statusCode: 400,
  message: "Validation failed",
  errors: [
    { field: "name", message: "Lender name is required" }
  ]
}
```

## 6. Key Patterns

### Controller → Service pattern

Controllers are thin — validate request, call service, send response. Services contain all business logic.

```typescript
// controller
const createLender = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const lender = await lenderService.create(req.body);
        res.status(201).json(apiResponse(201, "Lender created", lender));
    } catch (error) {
        next(error);
    }
};

// service
const create = async (data: CreateLenderInput): Promise<ILender> => {
    const lenderId = await counterService.getNextId("lender");
    return await Lender.create({ ...data, lenderId });
};
```

### Auto-ID Generation (Counter service)

All entities use auto-generated sequential IDs via the `counters` collection:

| Entity | Prefix | Padding | Example |
|--------|--------|---------|---------|
| Lender | `L` | 3 | `L001` |
| Investment | `INV-` | 5 | `INV-00001` |
| Repayment | `REP-` | 5 | `REP-00001` |
| Vehicle | `VH-` | 5 | `VH-00001` |
| Consignment | `CS-` | 5 | `CS-00001` |
| Vehicle Owner | `OWN-` | 3 | `OWN-001` |

### Pre-save hooks — auto-calculations

Mongoose pre-save hooks handle all computed fields. Never calculate these in controllers.

```typescript
// Vehicle model pre-save
vehicleSchema.pre('save', function() {
    this.totalInvestment = this.purchasePrice + this.travelCost + this.workshopRepairCost
        + this.sparePartsAccessories + this.alignmentWork + this.paintingPolishingCost
        + this.washingDetailingCost + this.fuelCost + this.paperworkTaxInsurance
        + this.commission + this.otherExpenses;

    if (this.dateSold && this.soldPrice) {
        this.profitLoss = this.soldPrice - this.totalInvestment;
    } else {
        this.profitLoss = -this.totalInvestment; // unrealized
    }
});
```

### Exchange Vehicle Service (SHARED)

The `exchange-vehicle.service.ts` handles auto-creation of exchange vehicles. Used by both:
- Phase 2: `POST /api/v1/vehicles/:id/sale-payments` (when `type: 'exchange'`)
- Phase 3: `POST /api/v1/consignments/:id/buyer-payments` (when `type: 'exchange'`)

### Soft Delete

All entities use `isActive: boolean` for soft delete. Queries default to `{ isActive: true }`.

## 7. Environment Variables

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/vehiclebook
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
NODE_ENV=development
```

## 8. Security

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt with 12 salt rounds |
| JWT Access Token | 15 min expiry, stored in memory (frontend) |
| JWT Refresh Token | 7 day expiry, httpOnly secure cookie |
| Rate Limiting | 100 req/15min (general), 5 req/15min (auth) |
| Input Validation | Zod schemas on every route |
| Helmet | HTTP security headers |
| CORS | Whitelist frontend origin only |
| Mongo Injection | express-mongo-sanitize |
| XSS Protection | xss-clean middleware |
| Request Size | 10KB JSON body limit |

## 9. Code Style

- Tabs, width 4
- TypeScript strict mode
- Async/await (no callbacks)
- Error handling: wrap controller body in try/catch, call `next(error)`
- No `any` type — use proper interfaces
- Use Zod for runtime validation, TypeScript for compile-time
