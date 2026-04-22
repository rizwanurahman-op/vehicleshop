import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import * as voc from "../controllers/vehicle-owner.controller";

const router = Router();
router.use(authenticate);

router.get("/", voc.getVehicleOwners);
router.post("/", voc.createVehicleOwner);
router.get("/:id", voc.getVehicleOwner);
router.patch("/:id", voc.updateVehicleOwner);
router.delete("/:id", voc.deleteVehicleOwner);

export default router;
