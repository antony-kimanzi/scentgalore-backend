import z from "zod";

export const updateCartItemSchema = z.object({
  quantity: z
    .number()
    .positive("Quantity must be a positive integer")
    .refine((value) => value > 0, "Quantity must be greater than 0"),
});
