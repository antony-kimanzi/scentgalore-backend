import { Router } from "express";
import { idParamSchema } from "../schema/paramSchema.js";
import { updateCartItemSchema } from "../schema/cartSchema.js";
import { authenticateUser, validateRequest } from "../middleware/validation.js";
import { cartController } from "../controllers/cart.js";
import { cartItemController } from "../controllers/cartItem.js";

const router = Router();

router.post(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  cartItemController.addItem
);

router.get("/", authenticateUser, cartController.getCart);

router.patch(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  validateRequest(updateCartItemSchema),
  cartItemController.updateItem
);

router.delete("/", authenticateUser, cartController.deleteCart);

router.delete(
  "/:id",
  authenticateUser,
  validateRequest(idParamSchema, "params"),
  cartItemController.deleteItem
);

export default router;
