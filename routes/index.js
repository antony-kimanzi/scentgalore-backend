import userRoutes from "./user.js";
import authRoutes from "./auth.js";
import productRoutes from "./product.js";
import cartRoutes from "./cart.js";
import orderRoutes from "./order.js";
import { Router } from "express";

const router = Router();

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/product", productRoutes);
router.use("/cart", cartRoutes);
router.use("/order", orderRoutes);

export default router;
