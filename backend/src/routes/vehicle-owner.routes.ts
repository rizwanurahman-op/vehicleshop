import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import * as voc from "../controllers/vehicle-owner.controller";

const router = Router();
router.use(authenticate);

router.get("/", asyncHandler(voc.getVehicleOwners));
router.post("/", isAdmin, asyncHandler(voc.createVehicleOwner));
router.get("/:id", asyncHandler(voc.getVehicleOwner));
router.patch("/:id", isAdmin, asyncHandler(voc.updateVehicleOwner));
router.delete("/:id", isAdmin, asyncHandler(voc.deleteVehicleOwner));

export default router;
