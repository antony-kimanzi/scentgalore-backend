import { Router } from "express";
import {
  validateRequest,
  verifyUser,
  requireAdminAuth,
} from "../middleware/validation.js";
import {
  stkPushSchema,
  paymentStatusSchema,
  processPaymentSchema,
  adminPaymentQuerySchema,
  queryStatusSchema,
} from "../schema/orderSchema.js";
import { paymentController } from "../controllers/payment.js";
import {
  idParamSchema,
  checkoutRequestIDParamSchema,
} from "../schema/paramSchema.js";
import bodyParser from "body-parser";

const router = Router();

// Custom middleware for M-Pesa callback with raw body parsing
const rawBodyParser = (req, res, next) => {
  if (req.originalUrl.includes("/callback")) {
    let data = "";

    req.setEncoding("utf8");

    req.on("data", (chunk) => {
      data += chunk;
    });

    req.on("end", () => {
      console.log("📦 Raw callback data received:", data);

      try {
        // Try to parse as JSON first
        if (data.trim().startsWith("{") || data.trim().startsWith("[")) {
          req.body = JSON.parse(data);
          console.log("✅ Parsed as JSON:", req.body);
        } else if (data.trim().startsWith("ws_CO_")) {
          // If it's just a CheckoutRequestID string
          req.body = { CheckoutRequestID: data.trim() };
          console.log("✅ Parsed as CheckoutRequestID:", req.body);
        } else if (data.trim() === "") {
          // Empty callback
          req.body = {};
          console.log("⚠️ Empty callback received");
        } else {
          // Unknown format, store as raw
          req.body = { raw: data };
          console.log("⚠️ Unknown format, storing as raw:", data);
        }
      } catch (error) {
        console.error("❌ JSON parse error:", error.message);
        req.body = { raw: data };
      }

      next();
    });
  } else {
    // For other routes, use regular body parser
    next();
  }
};

// Apply the raw body parser BEFORE regular body parsers
router.use(rawBodyParser);

// Then apply regular body parsers
router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Initiate STK Push payment (requires authentication)
router.post(
  "/stkpush",
  verifyUser,
  validateRequest(stkPushSchema),
  paymentController.initiatePayment,
);

// M-Pesa callback (no authentication - called by M-Pesa)
router.post("/callback", paymentController.handleCallback);

// Verify payment by checkoutRequestID
router.get(
  "/verify/:checkoutRequestID",
  validateRequest(checkoutRequestIDParamSchema, "params"),
  paymentController.verifyPayment,
);

// Verify payment by order ID (authenticated users only)
router.get(
  "/order/:orderId/verify",
  verifyUser,
  validateRequest(idParamSchema, "params", { paramName: "orderId" }),
  paymentController.verifyPaymentByOrderId,
);

// Get payment status for multiple orders (authenticated users only)
router.post(
  "/status",
  verifyUser,
  validateRequest(paymentStatusSchema),
  paymentController.getPaymentStatus,
);

// ===== ADMIN ROUTES =====

// Get all payments (Admin only)
router.get(
  "/admin/payments",
  requireAdminAuth,
  validateRequest(adminPaymentQuerySchema, "query"),
  paymentController.getAllPayments,
);

// Get payment by ID (Admin only)
router.get(
  "/admin/payments/:paymentId",
  requireAdminAuth,
  validateRequest(idParamSchema, "params", { paramName: "paymentId" }),
  paymentController.getPaymentById,
);

// Process/verify payment (Admin only)
router.put(
  "/admin/payments/:paymentId/process",
  requireAdminAuth,
  validateRequest(processPaymentSchema),
  paymentController.processPayment,
);

router.get("/admin/stats", requireAdminAuth, paymentController.getPaymentStats);
// In payment.js routes (temporary for testing)
router.post("/test-callback", paymentController.testCallback);

// In payment.js routes
router.post(
  "/manual-verify",
  verifyUser,
  paymentController.manualVerifyPayment,
);

// In payment.js routes
router.post(
  "/query-status",
  verifyUser,
  validateRequest(queryStatusSchema),
  paymentController.queryPaymentStatus,
);

export default router;
