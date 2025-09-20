import { Router } from "express";
import { productController } from "../controllers/product.js";
import { productSchema, updateProductSchema } from "../schema/productSchema.js";
import { validateRequest } from "../middleware/validation.js";
import { idParamSchema } from "../schema/paramSchema.js";

const router = Router();

router.post("/", validateRequest(productSchema), productController.addProduct);

router.get(
  "/:id",
  validateRequest(idParamSchema, "params"),
  productController.getProduct
);

router.get("/", productController.getAllProducts);

router.patch(
  "/:id",
  validateRequest(idParamSchema, "params"),
  validateRequest(updateProductSchema),
  productController.updateProduct
);

router.delete(
  "/:id",
  validateRequest(idParamSchema, "params"),
  productController.deleteProduct
);

export default router;
