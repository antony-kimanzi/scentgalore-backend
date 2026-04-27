import { authController } from "../controllers/auth.js";
import { Router } from "express";
import { requireAuth, validateRequest } from "../middleware/validation.js";
import {
  googleAuthSchema,
  loginSchema,
  registerSchema,
} from "../schema/userSchema.js";
import { googleAuthController } from "../controllers/googleAuth.js";

const router = Router();

router.post(
  "/login",
  validateRequest(loginSchema, "body"),
  authController.login,
);
router.post(
  "/register",
  validateRequest(registerSchema, "body"),
  authController.register,
);

router.post("/logout", requireAuth, authController.logout);

router.post(
  "/google",
  validateRequest(googleAuthSchema, "body"),
  googleAuthController.authenticate,
);

export default router;
