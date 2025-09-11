import z from "zod";
import { sanitizeInput } from "../utils/validation";

export const validateRequest = (schema, part = "body") => {
  return (req, res, next) => {
    try {
      const sanitizedData = sanitizeInput(req[part]);
      const validatedData = schema.parse(sanitizedData);

      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          fields: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          error: "Validation failed",
          message: "Check your input data",
          details: errors,
        });
      }

      res
        .status(500)
        .json({ error: "Internal server error during validation" });
    }
  };
};
