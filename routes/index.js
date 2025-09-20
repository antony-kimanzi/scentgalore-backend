import userRoutes from "./user.js";
import authRoutes from "./auth.js";
import productRoutes from "./product.js";
import cartRoutes from "./cart.js";
import { Router } from "express";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/product", productRoutes);
router.use("/cart", cartRoutes);

export default router;
