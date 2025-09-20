import { Router } from "express";
import { authenticateUser, validateRequest } from "../middleware/validation.js";
import { updateUserSchema } from "../schema/userSchema.js";
import { userController } from "../controllers/user.js";

const router = Router();

router.patch(
  "/",
  authenticateUser,
  validateRequest(updateUserSchema),

  userController.updateUserInfo
);

router.get("/", authenticateUser, userController.getUserInfo);

export default router;
