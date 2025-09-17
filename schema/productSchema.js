import z from "zod";

export const productSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(255, "Name should not exceed 255 characters")
    .transform((name) => name.trim()),

  shortDescription: z
    .string()
    .min(5, "Short description must be at least 5 characters")
    .max(100, "Short description should not exceed 50 characters")
    .transform((shortDescription) => shortDescription.trim()),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .transform((description) => description.trim()),

  price: z
    .number()
    .positive("Price must be positive")
    .max(999999.99, "Price cannot exceed 999,999.99")
    .refine((value) => {
      const decimalPart = value.toString().split(".")[1];
      return !decimalPart || decimalPart.length <= 2;
    }, "Price can have at most two decimal places"),

  imageUrl: z
    .string()
    .min(1, "Image url is required")
    .max(100, "Image url should not exceed 100 characters")
    .transform((imageUrl) => imageUrl.trim()),

  category: z
    .string()
    .min(3, "Category must be at least 3 characters")
    .max(100, "Category should not exceed 100 characters")
    .transform((category) => category.toLowerCase().trim()),
});
