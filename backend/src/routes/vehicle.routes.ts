import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { exportLimiter, writeLimiter } from "../middleware/rate-limit.middleware";
import * as vc from "../controllers/vehicle.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Stats & Reports (before /:id to avoid conflicts) ─────────────
router.get("/stats", asyncHandler(vc.getVehicleStats));
router.get("/export", exportLimiter, asyncHandler(vc.exportVehicles));
router.get("/reports/profit-loss", asyncHandler(vc.getProfitLossReport));
router.get("/reports/profit-loss/export", exportLimiter, asyncHandler(vc.exportProfitLoss));
router.get("/reports/monthly", asyncHandler(vc.getMonthlyReport));
router.get("/reports/pending", asyncHandler(vc.getPendingReport));
router.get("/reports/inventory", asyncHandler(vc.getInventoryReport));
router.get("/reports/purchases", asyncHandler(vc.getPurchaseRegister));
router.get("/reports/purchases/export", exportLimiter, asyncHandler(vc.exportPurchases));

// ── Vehicle CRUD ──────────────────────────────────────────────────
router.get("/", asyncHandler(vc.getVehicles));
router.post("/", isAdmin, writeLimiter, asyncHandler(vc.createVehicle));
router.get("/lookup", asyncHandler(vc.lookupVehicles));   // must be BEFORE /:id
router.get("/:id", asyncHandler(vc.getVehicle));
router.patch("/:id", isAdmin, writeLimiter, asyncHandler(vc.updateVehicle));
router.delete("/:id", isAdmin, writeLimiter, asyncHandler(vc.deleteVehicle));
router.get("/:id/export", exportLimiter, asyncHandler(vc.exportVehicleDetail));


// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", isAdmin, writeLimiter, asyncHandler(vc.updateCosts));
router.post("/:id/costs/recalc", isAdmin, writeLimiter, asyncHandler(vc.recalcCosts));
router.post("/:id/costs/breakdown", isAdmin, writeLimiter, asyncHandler(vc.addCostBreakdownItem));
router.delete("/:id/costs/breakdown/:itemId", isAdmin, writeLimiter, asyncHandler(vc.deleteCostBreakdownItem));

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", isAdmin, writeLimiter, asyncHandler(vc.recordSale));
router.patch("/:id/sale", isAdmin, writeLimiter, asyncHandler(vc.updateSale));
router.delete("/:id/sale", isAdmin, writeLimiter, asyncHandler(vc.undoSale));

// ── Purchase Payments ─────────────────────────────────────────────
router.post("/:id/purchase-payments", isAdmin, writeLimiter, asyncHandler(vc.addPurchasePayment));
router.delete("/:id/purchase-payments/:paymentId", isAdmin, writeLimiter, asyncHandler(vc.deletePurchasePayment));

// ── Sale Payments ─────────────────────────────────────────────────
router.post("/:id/sale-payments", isAdmin, writeLimiter, asyncHandler(vc.addSalePayment));
router.delete("/:id/sale-payments/:paymentId", isAdmin, writeLimiter, asyncHandler(vc.deleteSalePayment));

export default router;
