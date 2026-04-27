import z from "zod";
import jwt from "jsonwebtoken";
import { sanitizeInput } from "../utils/validation.js";
import authConfig from "../config/authConfig.js";
import prisma from "../lib/prisma.js";
import { v4 as uuidv4 } from "uuid";

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

        console.log({
          error: "Validation failed",
          message: "Please check your input data",
          details: formattedError,
        });

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

// Optional: Combined authentication and authorization middleware
export const authWithRole = (role) => {
  return async (req, res, next) => {
    try {
      // First authenticate
      const token = req.cookies.accessToken;

      if (!token) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const decoded = jwt.verify(token, authConfig.secret);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Set user info in request
      req.userId = user.id;
      req.userRole = user.role;

      // Check role if specified
      if (role && user.role !== role) {
        return res.status(403).json({
          error: `Access denied. ${role} role required.`,
        });
      }

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(403).json({ error: "Invalid or expired token" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

export const verifyUser = async (req, res, next) => {
  if (!req.userId && !req.cookies.accessToken && !req.cookies.guest_id) {
    const guestId = uuidv4();
    try {
      await prisma.guest.create({
        data: { id: guestId },
      });
    } catch (error) {
      console.log("Create guest error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }

    res.cookie("guest_id", guestId, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    req.guestId = guestId;
  } else if (req.cookies.accessToken) {
    authWithRole();
  } else {
    req.guestId = req.cookies.guest_id;
  }

  next();
};

export const requireAuth = authWithRole();
export const requireAdminAuth = authWithRole("admin");
export const requireClientAuth = authWithRole("client");
