import { Router } from "express";
import { validateRequest, authenticateUser } from "../middleware/validation.js";
import { orderSchema, updateOrderSchema } from "../schema/orderSchema.js";
import { orderController } from "../controllers/order.js";
import { idParamSchema } from "../schema/paramSchema.js";

const router = Router();

router.post(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  validateRequest(orderSchema),
  orderController.createOrder
);

router.get(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  orderController.getOrder
);

router.patch(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  validateRequest(updateOrderSchema),
  orderController.updateOrder
);

router.delete(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  orderController.deleteOrder
);

export default router;
