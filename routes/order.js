import { Router } from "express";
import { validateRequest, verifyUser } from "../middleware/validation.js";
import { orderSchema, updateOrderSchema } from "../schema/orderSchema.js";
import { orderController } from "../controllers/order.js";
import { idParamSchema } from "../schema/paramSchema.js";

const router = Router();

// Order routes only
router.post(
  "/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  validateRequest(orderSchema),
  orderController.createOrder,
);

router.get(
  "/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  orderController.getOrder,
);

router.get("/", verifyUser, orderController.getAllOrders);

router.get("/user", verifyUser, orderController.getUserOrders);

router.patch(
  "/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  validateRequest(updateOrderSchema),
  orderController.updateOrder,
);

router.delete(
  "/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  orderController.deleteOrder,
);

// Only keep order-specific payment verification
router.get(
  "/:orderId/payment/verify",
  verifyUser,
  validateRequest(idParamSchema, "params", { paramName: "orderId" }),
  orderController.verifyOrderPayment,
);

router.post(
  "/:orderId/clear-cart-mpesa",
  verifyUser,
  validateRequest(idParamSchema, "params", { paramName: "orderId" }),
  orderController.clearCartForSuccessfulPayment,
);

// Add to order.js routes
router.get(
  "/:orderId/debug-payment",
  verifyUser,
  validateRequest(idParamSchema, "params", { paramName: "orderId" }),
  orderController.debugPayment,
);

// In order.js routes
router.get(
  "/:orderId/debug",
  verifyUser,
  validateRequest(idParamSchema, "params", { paramName: "orderId" }),
  orderController.debugOrderStatus,
);

export default router;
