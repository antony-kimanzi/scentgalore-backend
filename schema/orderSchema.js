import z from "zod";

export const shippingDetailSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name should not exceed 255 characters")
    .transform((name) => name.trim()),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name should not exceed 255 characters")
    .transform((name) => name.trim()),
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email must not exceed 255 characters")
    .transform((email) => email.toLowerCase().trim()),
  phoneNumber: z
    .string()
    .min(1, "Phone number is required")
    .regex(
      /^(\+?254|0)[17]\d{8}$/,
      "Please provide a valid Kenyan phone number"
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
});

export const billingDetailSchema = shippingDetailSchema;

export const orderSchema = z.object({
  paymentMethod: z
    .string()
    .min(3, "Payment method should be at least 3 characters")
    .max(100, "Payment method should not exceed 100 characters")
    .transform((value) => value.trim()),
  shippingMethod: z
    .string()
    .min(3, "Payment method should be at least 3 characters")
    .max(100, "Payment method should not exceed 100 characters")
    .transform((value) => value.trim()),
  totalAmount: z
    .number()
    .positive("Total amount must be a positive number")
    .max(999999.99, "Total amount should not exceed 999999.99")
    .refine((value) => {
      const decimalPart = value.toString().split(".")[1];
      return !decimalPart || decimalPart.length <= 2;
    }, "Total amount can have at most two decimal places"),
  shipping: shippingDetailSchema,
  billing: billingDetailSchema.optional(),
});

export const updateOrderSchema = z.object({
  status: z
    .string()
    .min(1, "Status is required")
    .max(50, "Status should not exceed 50 characters")
    .transform(status => status.trim().toLowerCase())
    .refine(
      value => ["pending", "completed", "processing", "shipped", "cancelled"].includes(value),
      "Status must be one of: pending, processing, shipped, completed, cancelled"
    ),
  
  // Optional fields for partial updates
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
});
