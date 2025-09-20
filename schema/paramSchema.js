import z from "zod";

export const idParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "ID must be a numeric value")
    .transform((id) => parseInt(id, 10))
    .refine((id) => id > 0, "ID must be a positive integer"),
});
