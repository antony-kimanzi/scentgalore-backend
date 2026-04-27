import z from "zod";

export const shippingDetailSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name should not exceed 50 characters")
    .transform((name) => name.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name should not exceed 50 characters")
    .transform((name) => name.trim()),
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email must not exceed 100 characters")
    .transform((email) => email.toLowerCase().trim()),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^(\+?254|0)[17]\d{8}$/,
      "Please provide a valid Kenyan phone number",
    )
    .transform((phone) => {
      // Convert to international format: +254...
      if (phone.startsWith("0")) {
        return "+254" + phone.substring(1);
      } else if (phone.startsWith("254")) {
        return "+" + phone;
      } else if (phone.startsWith("+254")) {
        return phone;
      }
      return phone;
    }),
  city: z
    .string()
    .min(1, "City is required")
    .max(50, "City should not exceed 50 characters")
    .transform((city) => city.trim()),
  apartment: z
    .string()
    .min(3, "Apartment should at least be 3 characters")
    .max(255, "Apartment should not exceed 255 characters")
    .transform((value) => value.trim())
    .optional(),
  postalCode: z
    .string()
    .min(3, "Postal code should at least be 3 characters")
    .max(50, "Postal code should not exceed 50 characters")
    .transform((value) => value.trim())
    .optional(),
});

export const billingDetailSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name should not exceed 50 characters")
    .transform((name) => name.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name should not exceed 50 characters")
    .transform((name) => name.trim()),
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email must not exceed 100 characters")
    .transform((email) => email.toLowerCase().trim())
    .optional(),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^(\+?254|0)[17]\d{8}$/,
      "Please provide a valid Kenyan phone number",
    )
    .transform((phone) => {
      // Convert to international format: +254...
      if (phone.startsWith("0")) {
        return "+254" + phone.substring(1);
      } else if (phone.startsWith("254")) {
        return "+" + phone;
      } else if (phone.startsWith("+254")) {
        return phone;
      }
      return phone;
    }),
});

export const orderSchema = z.object({
  contact: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(255, "Email must not exceed 255 characters")
    .transform((email) => email.toLowerCase().trim()),
  paymentMethod: z
    .string()
    .min(1, "Payment method is required")
    .max(100, "Payment method should not exceed 100 characters")
    .transform((value) => value.trim()),
  shippingMethod: z
    .string()
    .min(1, "Shipping method is required")
    .max(100, "Shipping method should not exceed 100 characters")
    .transform((value) => value.trim()),
  totalAmount: z
    .number()
    .positive("Total amount must be a positive number")
    .max(999999.99, "Total amount should not exceed 999999.99")
    .refine((value) => {
      const decimalPart = value.toString().split(".")[1];
      return !decimalPart || decimalPart.length <= 2;
    }, "Total amount can have at most two decimal places")
    .optional(),
  isPaid: z.boolean().default(false),
  shipping: shippingDetailSchema.optional(),
  billing: billingDetailSchema.optional(),
});

export const updateOrderSchema = z.object({
  status: z
    .string()
    .min(1, "Status is required")
    .max(50, "Status should not exceed 50 characters")
    .transform((status) => status.trim().toLowerCase())
    .refine(
      (value) =>
        [
          "pending",
          "pending_payment",
          "paid",
          "payment_failed",
          "processing",
          "shipped",
          "delivered",
          "cancelled",
        ].includes(value),
      "Status must be one of: pending, pending_payment, paid, payment_failed, processing, shipped, delivered, cancelled",
    )
    .optional(),

  paymentMethod: z
    .string()
    .min(3, "Payment method should be at least 3 characters")
    .max(100, "Payment method should not exceed 100 characters")
    .transform((value) => value.trim())
    .optional(),

  shippingMethod: z
    .string()
    .min(3, "Shipping method should be at least 3 characters")
    .max(100, "Shipping method should not exceed 100 characters")
    .transform((value) => value.trim())
    .optional(),

  totalAmount: z
    .number()
    .positive("Total amount must be a positive number")
    .max(999999.99, "Total amount should not exceed 999999.99")
    .optional(),

  isPaid: z.boolean().optional(),

  // Payment tracking fields
  checkoutRequestID: z
    .string()
    .max(100, "Checkout request ID should not exceed 100 characters")
    .optional(),

  mpesaReceipt: z
    .string()
    .max(50, "M-Pesa receipt should not exceed 50 characters")
    .optional(),

  paymentPhone: z
    .string()
    .regex(
      /^(\+?254|0)[17]\d{8}$/,
      "Please provide a valid Kenyan phone number",
    )
    .optional(),

  paymentAmount: z
    .number()
    .positive("Payment amount must be positive")
    .max(999999.99, "Payment amount should not exceed 999999.99")
    .optional(),

  paymentDate: z
    .string()
    .datetime()
    .or(z.date())
    .transform((val) => new Date(val))
    .optional(),

  paymentError: z.string().optional(),
});

// STK Push request schema
export const stkPushSchema = z.object({
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^(\+?254|0)[17]\d{8}$/,
      "Please provide a valid Kenyan phone number",
    ),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(999999.99, "Amount should not exceed 999999.99"),
  orderId: z.number().int().positive("Order ID must be a positive integer"),
});

// Payment update schema for M-Pesa callback
export const paymentUpdateSchema = z.object({
  checkoutRequestID: z.string().min(1, "Checkout request ID is required"),
  paymentData: z.object({
    resultCode: z.number().int(),
    resultDesc: z.string(),
    mpesaReceipt: z.string().optional(),
    phone: z.string().optional(),
    amount: z.number().optional(),
    rawCallback: z.any().optional(),
  }),
});

// Payment status request schema
export const paymentStatusSchema = z.object({
  orderIds: z
    .array(z.number().int().positive("Order ID must be a positive integer"))
    .min(1, "At least one order ID is required"),
});

// Payment-related schemas
export const processPaymentSchema = z.object({
  status: z.enum(["completed", "failed", "cancelled"]),
  notes: z.string().optional(),
});

export const adminPaymentQuerySchema = z.object({
  status: z.enum(["pending", "completed", "failed", "cancelled"]).optional(),
  paymentMethod: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).default("1"),
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
});

export const queryStatusSchema = z.object({
  checkoutRequestID: z
    .string()
    .max(100, "Checkout request ID should not exceed 100 characters")
    .optional(),
});
