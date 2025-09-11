import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const sanitizeInput = (data) => {
  if (typeof data === "string") {
    return data.trim().replace(/[<>]/g, "");
  }

  if (typeof data === "object" && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }

    return sanitized;
  }

  return data;
};

export const validateAndSanitize = (schema, data) => {
  try {
    const sanitizeData = sanitizeInput(data);
    const validateData = schema.parse(sanitizeData);
    return {
      success: true,
      data: validateData,
      error: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const err = error.errors.map((err) => ({
        fields: err.path.join("."),
        message: err.message,
      }));

      return {
        success: false,
        data: null,
        err,
      };
    }

    throw error;
  }
};

export const checkEmailUnique = async (email, excludeUserId = null) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser && existingUser[id] != excludeUserId) {
    return {
      valid: false,
      error: "Email already exists",
    };
  }

  return {
    valid: true,
    error: null,
  };
};
