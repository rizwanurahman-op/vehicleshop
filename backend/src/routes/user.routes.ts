import { Router } from "express";
import { authenticate, isAdmin } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validate } from "../middleware/validate.middleware";
import { createViewerSchema, updateUserSchema } from "../schemas/user.schema";
import { listUsers, createViewer, deleteUser, getUserById, updateUser } from "../controllers/user.controller";

const router = Router();

// All user management routes require authentication + admin role
router.use(authenticate, isAdmin);

router.get("/", asyncHandler(listUsers));
router.post("/", validate(createViewerSchema), asyncHandler(createViewer));
router.get("/:id", asyncHandler(getUserById));
router.put("/:id", validate(updateUserSchema), asyncHandler(updateUser));
router.delete("/:id", asyncHandler(deleteUser));

export default router;

