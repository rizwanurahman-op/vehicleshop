import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import * as vc from "../controllers/vehicle.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Stats & Reports (before /:id to avoid conflicts) ─────────────
router.get("/stats", asyncHandler(vc.getVehicleStats));
router.get("/export", asyncHandler(vc.exportVehicles));
router.get("/reports/profit-loss", asyncHandler(vc.getProfitLossReport));
router.get("/reports/profit-loss/export", asyncHandler(vc.exportProfitLoss));
router.get("/reports/monthly", asyncHandler(vc.getMonthlyReport));
router.get("/reports/pending", asyncHandler(vc.getPendingReport));
router.get("/reports/inventory", asyncHandler(vc.getInventoryReport));
router.get("/reports/purchases", asyncHandler(vc.getPurchaseRegister));
router.get("/reports/purchases/export", asyncHandler(vc.exportPurchases));

// ── Vehicle CRUD ──────────────────────────────────────────────────
router.get("/", asyncHandler(vc.getVehicles));
router.post("/", isAdmin, asyncHandler(vc.createVehicle));
router.get("/lookup", asyncHandler(vc.lookupVehicles));   // must be BEFORE /:id
router.get("/:id", asyncHandler(vc.getVehicle));
router.patch("/:id", isAdmin, asyncHandler(vc.updateVehicle));
router.delete("/:id", isAdmin, asyncHandler(vc.deleteVehicle));
router.get("/:id/export", asyncHandler(vc.exportVehicleDetail));


// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", isAdmin, asyncHandler(vc.updateCosts));
router.post("/:id/costs/recalc", isAdmin, asyncHandler(vc.recalcCosts));
router.post("/:id/costs/breakdown", isAdmin, asyncHandler(vc.addCostBreakdownItem));
router.delete("/:id/costs/breakdown/:itemId", isAdmin, asyncHandler(vc.deleteCostBreakdownItem));

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", isAdmin, asyncHandler(vc.recordSale));
router.patch("/:id/sale", isAdmin, asyncHandler(vc.updateSale));
router.delete("/:id/sale", isAdmin, asyncHandler(vc.undoSale));

// ── Purchase Payments ─────────────────────────────────────────────
router.post("/:id/purchase-payments", isAdmin, asyncHandler(vc.addPurchasePayment));
router.delete("/:id/purchase-payments/:paymentId", isAdmin, asyncHandler(vc.deletePurchasePayment));

// ── Sale Payments ─────────────────────────────────────────────────
router.post("/:id/sale-payments", isAdmin, asyncHandler(vc.addSalePayment));
router.delete("/:id/sale-payments/:paymentId", isAdmin, asyncHandler(vc.deleteSalePayment));

export default router;
