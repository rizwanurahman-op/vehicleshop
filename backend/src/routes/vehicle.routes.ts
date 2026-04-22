import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as vc from "../controllers/vehicle.controller";

const router = Router();

// All routes protected
router.use(authenticate);

// ── Stats & Reports (before /:id to avoid conflicts) ─────────────
router.get("/stats", vc.getVehicleStats);
router.get("/reports/profit-loss", vc.getProfitLossReport);
router.get("/reports/monthly", vc.getMonthlyReport);
router.get("/reports/pending", vc.getPendingReport);
router.get("/reports/inventory", vc.getInventoryReport);
router.get("/reports/purchases", vc.getPurchaseRegister);

// ── Vehicle CRUD ──────────────────────────────────────────────────
router.get("/", vc.getVehicles);
router.post("/", vc.createVehicle);
router.get("/lookup", vc.lookupVehicles);   // must be BEFORE /:id
router.get("/:id", vc.getVehicle);
router.patch("/:id", vc.updateVehicle);
router.delete("/:id", vc.deleteVehicle);

// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", vc.updateCosts);
router.post("/:id/costs/recalc", vc.recalcCosts);
router.post("/:id/costs/breakdown", vc.addCostBreakdownItem);
router.delete("/:id/costs/breakdown/:itemId", vc.deleteCostBreakdownItem);

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", vc.recordSale);
router.patch("/:id/sale", vc.updateSale);
router.delete("/:id/sale", vc.undoSale);

// ── Purchase Payments ─────────────────────────────────────────────
router.post("/:id/purchase-payments", vc.addPurchasePayment);
router.delete("/:id/purchase-payments/:paymentId", vc.deletePurchasePayment);

// ── Sale Payments ─────────────────────────────────────────────────
router.post("/:id/sale-payments", vc.addSalePayment);
router.delete("/:id/sale-payments/:paymentId", vc.deleteSalePayment);

export default router;
