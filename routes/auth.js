import { authController } from "../controllers/auth.js";
import { Router } from "express";
import { authenticateUser, validateRequest } from "../middleware/validation.js";
import {
  loginSchema,
  userSchema,
} from "../schema/userSchema.js";

const router = Router();

router.post(
  "/login",
  validateRequest(loginSchema, "body"),
  authController.login
);
router.post(
  "/register",
  validateRequest(userSchema, "body"),
  authController.register
);

router.post(
  "/logout",
  authenticateUser,
  authController.logout
);

export default router;
