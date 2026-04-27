import { z } from "zod";

export const userSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(100, "First name cannot exceed 100 characters")
    .transform((name) => name.trim()),

  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(100, "Last name cannot exceed 100 characters")
    .transform((name) => name.trim()),

  username: z
    .string()
    .min(2, "Username must be at least 2 characters")
    .max(50, "Username cannot exceed 100 characters")
    .transform((name) => name.trim())
    .optional(),

  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(255, "Email must not exceed 255 characters")
    .transform((email) => email.toLowerCase().trim()),

  // Make password optional for Google OAuth users
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .optional() // Add optional for registration
    .or(z.literal("").transform(() => undefined)), // Handle empty strings
});

export const loginSchema = z.object({
  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(100, "Email cannot exceed 255 characters")
    .transform((email) => email.toLowerCase().trim()),

  password: z
    .string()
    .min(1, "Password is required") // Change from min(8) to min(1) for basic validation
    .max(255, "Password cannot exceed 100 characters"),
  // Remove the regex validation for login to avoid revealing password requirements
});

// New schema for Google OAuth
export const googleAuthSchema = z.object({
  token: z.string().min(1, "Google token is required"),
});

export const updateUserSchema = userSchema.partial().extend({
  // Allow updating without password for Google users
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    )
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

// Optional: Create a separate schema for registration that requires password
export const registerSchema = userSchema.extend({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});
