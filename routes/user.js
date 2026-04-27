import { Router } from "express";
import {
  validateRequest,
  requireAdminAuth,
  requireClientAuth,
} from "../middleware/validation.js";
import { idParamSchema } from "../schema/paramSchema.js";
import { updateUserSchema } from "../schema/userSchema.js";
import { userController } from "../controllers/user.js";

const router = Router();

// User routes (for authenticated users)
router.patch(
  "/",
  requireClientAuth,
  validateRequest(updateUserSchema),
  userController.updateUserInfo
);

router.get("/", requireClientAuth, userController.getUserInfo);

// Admin routes
router.get("/admin/users", requireAdminAuth, userController.getAllUsers);

router.patch(
  "/admin/users/:userId",
  requireAdminAuth,
  validateRequest(idParamSchema, "params", { paramName: "userId" }),
  validateRequest(updateUserSchema),
  userController.updateUserInfo
);

router.delete(
  "/admin/users/:userId",
  requireAdminAuth,
  validateRequest(idParamSchema, "params", { paramName: "userId" }),
  userController.deleteUserInfo
);

export default router;
