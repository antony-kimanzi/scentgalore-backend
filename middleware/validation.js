import z from "zod";
import { sanitizeInput } from "../utils/validation.js";

export const validateRequest = (schema, part = "body") => {
  return (req, res, next) => {
    try {
      const sanitizedData = sanitizeInput(req[part]);
      const validatedData = schema.parse(sanitizedData);

      req.validatedData = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Use Zod's built-in formatting for safety
        const formattedError = error.format();

        return res.status(400).json({
          error: "Validation failed",
          message: "Please check your input data",
          details: formattedError,
        });
      }

      console.error("Unexpected validation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};
