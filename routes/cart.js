import { Router } from "express";
import { idParamSchema } from "../schema/paramSchema.js";
import { verifyUser, validateRequest } from "../middleware/validation.js";
import { cartController } from "../controllers/cart.js";
import { cartItemController } from "../controllers/cartItem.js";

const router = Router();

router.post(
  "/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  cartItemController.addItem,
);

router.get("/", verifyUser, cartController.getCart);

router.patch(
  "/add/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  cartItemController.addItemQuantity,
);

router.patch(
  "/subtract/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  cartItemController.subtractItemQuantity,
);

router.delete("/", verifyUser, cartController.deleteCart);

router.delete(
  "/:id",
  verifyUser,
  validateRequest(idParamSchema, "params"),
  cartItemController.deleteItem,
);

export default router;
