import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import * as vc from "../controllers/vehicle.controller";

const router = Router();

// All routes protected
router.use(authenticate);

// ── Stats & Reports (before /:id to avoid conflicts) ─────────────
router.get("/stats", asyncHandler(vc.getVehicleStats));
router.get("/reports/profit-loss", asyncHandler(vc.getProfitLossReport));
router.get("/reports/monthly", asyncHandler(vc.getMonthlyReport));
router.get("/reports/pending", asyncHandler(vc.getPendingReport));
router.get("/reports/inventory", asyncHandler(vc.getInventoryReport));
router.get("/reports/purchases", asyncHandler(vc.getPurchaseRegister));

// ── Vehicle CRUD ──────────────────────────────────────────────────
router.get("/", asyncHandler(vc.getVehicles));
router.post("/", asyncHandler(vc.createVehicle));
router.get("/lookup", asyncHandler(vc.lookupVehicles));   // must be BEFORE /:id
router.get("/:id", asyncHandler(vc.getVehicle));
router.patch("/:id", asyncHandler(vc.updateVehicle));
router.delete("/:id", asyncHandler(vc.deleteVehicle));

// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", asyncHandler(vc.updateCosts));
router.post("/:id/costs/recalc", asyncHandler(vc.recalcCosts));
router.post("/:id/costs/breakdown", asyncHandler(vc.addCostBreakdownItem));
router.delete("/:id/costs/breakdown/:itemId", asyncHandler(vc.deleteCostBreakdownItem));

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", asyncHandler(vc.recordSale));
router.patch("/:id/sale", asyncHandler(vc.updateSale));
router.delete("/:id/sale", asyncHandler(vc.undoSale));

// ── Purchase Payments ─────────────────────────────────────────────
router.post("/:id/purchase-payments", asyncHandler(vc.addPurchasePayment));
router.delete("/:id/purchase-payments/:paymentId", asyncHandler(vc.deletePurchasePayment));

// ── Sale Payments ─────────────────────────────────────────────────
router.post("/:id/sale-payments", asyncHandler(vc.addSalePayment));
router.delete("/:id/sale-payments/:paymentId", asyncHandler(vc.deleteSalePayment));

export default router;
