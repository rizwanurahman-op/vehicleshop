import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import * as cc from "../controllers/consignment.controller";

const router = Router();
router.use(authenticate);

// ── Stats, Reports & Export (before /:id to avoid conflicts) ──────
router.get("/stats", asyncHandler(cc.getConsignmentStats));
router.get("/reports", asyncHandler(cc.getReports));
router.get("/reports/export", asyncHandler(cc.exportReports));
router.get("/export", asyncHandler(cc.exportConsignments));

// ── CRUD ──────────────────────────────────────────────────────────
router.get("/", asyncHandler(cc.getConsignments));
router.post("/", isAdmin, asyncHandler(cc.createConsignment));
router.get("/:id", asyncHandler(cc.getConsignment));
router.get("/:id/export", asyncHandler(cc.exportConsignmentDetail));
router.put("/:id", isAdmin, asyncHandler(cc.updateConsignment));
router.patch("/:id", isAdmin, asyncHandler(cc.updateConsignment));
router.delete("/:id", isAdmin, asyncHandler(cc.deleteConsignment));

// ── Status Management ─────────────────────────────────────────────
router.patch("/:id/status", isAdmin, asyncHandler(cc.updateConsignmentStatus));
router.patch("/:id/return", isAdmin, asyncHandler(cc.returnConsignment));

// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", isAdmin, asyncHandler(cc.updateCosts));
router.post("/:id/costs/breakdown", isAdmin, asyncHandler(cc.addCostBreakdownItem));
router.delete("/:id/costs/breakdown/:itemId", isAdmin, asyncHandler(cc.deleteCostBreakdownItem));

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", isAdmin, asyncHandler(cc.recordSale));
router.delete("/:id/sale", isAdmin, asyncHandler(cc.undoSale));

// ── Buyer Payments ────────────────────────────────────────────────
router.post("/:id/buyer-payments", isAdmin, asyncHandler(cc.addBuyerPayment));
router.delete("/:id/buyer-payments/:paymentId", isAdmin, asyncHandler(cc.deleteBuyerPayment));

// ── Payee Payments ────────────────────────────────────────────────
router.post("/:id/payee-payments", isAdmin, asyncHandler(cc.addPayeePayment));
router.delete("/:id/payee-payments/:paymentId", isAdmin, asyncHandler(cc.deletePayeePayment));
router.post("/:id/payee-payments/close", isAdmin, asyncHandler(cc.closePayeeSettlement));

export default router;
