import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import * as cc from "../controllers/consignment.controller";

const router = Router();
router.use(authenticate);

// ── Stats & Reports (before /:id to avoid conflicts) ─────────────
router.get("/stats", asyncHandler(cc.getConsignmentStats));
router.get("/reports", asyncHandler(cc.getReports));

// ── CRUD ──────────────────────────────────────────────────────────
router.get("/", asyncHandler(cc.getConsignments));
router.post("/", asyncHandler(cc.createConsignment));
router.get("/:id", asyncHandler(cc.getConsignment));
router.patch("/:id", asyncHandler(cc.updateConsignment));
router.delete("/:id", asyncHandler(cc.deleteConsignment));

// ── Status Management ─────────────────────────────────────────────
router.patch("/:id/status", asyncHandler(cc.updateConsignmentStatus));
router.patch("/:id/return", asyncHandler(cc.returnConsignment));

// ── Costs ─────────────────────────────────────────────────────────
router.patch("/:id/costs", asyncHandler(cc.updateCosts));
router.post("/:id/costs/breakdown", asyncHandler(cc.addCostBreakdownItem));
router.delete("/:id/costs/breakdown/:itemId", asyncHandler(cc.deleteCostBreakdownItem));

// ── Sale ──────────────────────────────────────────────────────────
router.post("/:id/sale", asyncHandler(cc.recordSale));
router.delete("/:id/sale", asyncHandler(cc.undoSale));

// ── Buyer Payments ────────────────────────────────────────────────
router.post("/:id/buyer-payments", asyncHandler(cc.addBuyerPayment));
router.delete("/:id/buyer-payments/:paymentId", asyncHandler(cc.deleteBuyerPayment));

// ── Payee Payments ────────────────────────────────────────────────
router.post("/:id/payee-payments", asyncHandler(cc.addPayeePayment));
router.delete("/:id/payee-payments/:paymentId", asyncHandler(cc.deletePayeePayment));
router.post("/:id/payee-payments/close", asyncHandler(cc.closePayeeSettlement));

export default router;
