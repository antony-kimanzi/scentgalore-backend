import z from "zod";
import jwt from "jsonwebtoken";
import { sanitizeInput } from "../utils/validation.js";
import authConfig from "../config/authConfig.js";
import prisma from "../lib/prisma.js";

export const validateRequest = (schema, part = "body") => {
  return (req, res, next) => {
    try {
      const sanitizedData = sanitizeInput(req[part]);
      const validatedData = schema.parse(sanitizedData);

      if (part === "params") {
        req.params = validatedData;
      } else {
        req.validatedData = validatedData;
      }
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

export const authenticateUser = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized user" });
  }

  try {
    const decodedToken = jwt.verify(token, authConfig.secret);
    const user = await prisma.user.findUnique({
      where: { id: decodedToken.id },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.userId = decodedToken.id;
    next();
  } catch (error) {
    return res.status(401).json({ error: error || null });
  }
};
