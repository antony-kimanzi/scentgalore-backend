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
    .transform((name) => name.trim()),

  email: z
    .string()
    .email("Please provide a valid email address")
    .min(5, "Email must be at least 5 characters")
    .max(255, "Email must not exceed 255 characters")
    .transform((email) => email.toLowerCase().trim()),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password cannot exceed 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
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
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password cannot exceed 100 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
});

export const updateUserSchema = userSchema.partial();
