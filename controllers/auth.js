// controllers/auth.js
import prisma from "../lib/prisma.js";
import { passwordUtils } from "../utils/password.js";
import jwt from "jsonwebtoken";
import authConfig from "../config/authConfig.js";
import { validateEmailUnique } from "../utils/validation.js";

export const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.validatedData;

      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          googleId: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!existingUser) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      // Prevent admin from logging in if they have googleId
      if (existingUser.googleId && existingUser.role === "admin") {
        return res.status(403).json({
          error: "Admin accounts cannot use Google login",
        });
      }

      // Check if this is a Google-only user
      if (existingUser.googleId && !existingUser.password) {
        return res.status(409).json({
          error: "This account uses Google login. Please sign in with Google",
        });
      }

      let correctPassword;
      try {
        correctPassword = await passwordUtils.comparePassword(
          password,
          existingUser.password
        );
      } catch (error) {
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!correctPassword) {
        return res.status(409).json({ error: "Invalid Credentials" });
      }

      const { password: _, ...userWithoutPassword } = existingUser;

      const user = userWithoutPassword;

      const accessToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        authConfig.secret,
        {
          expiresIn: authConfig.expiresIn,
        }
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1440 * 60 * 1000,
        sameSite: "strict",
      });

      return res.status(200).json({ user });
    } catch (error) {
      console.log("error: ", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error || null,
      });
    }
  },

  async register(req, res) {
    try {
      const { email, firstName, lastName, password } = req.validatedData;

      const existingUser = await prisma.user.findFirst({ where: { email } });

      if (existingUser) {
        return res.status(409).json({
          error: "User already exists. Please login",
        });
      }

      const checkEmail = await validateEmailUnique(email);

      if (!checkEmail.valid) {
        return res.status(409).json({ error: checkEmail.error });
      }

      const hashedPassword = await passwordUtils.hashPassword(password);

      await prisma.user.create({
        data: {
          firstName: firstName,
          lastName: lastName,
          username: firstName,
          email: email,
          password: hashedPassword,
          role: "client", // All registered users are clients
        },
      });

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const accessToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        authConfig.secret,
        {
          expiresIn: authConfig.expiresIn,
        }
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1440 * 60 * 1000,
        sameSite: "strict",
      });

      return res.status(201).json({ user });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async googleCallback(req, res) {
    try {
      const { googleId, email, firstName, lastName } = req.body;

      // Check if user exists
      let user = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { googleId }],
        },
      });

      if (user) {
        // If user exists and is an admin, block Google login
        if (user.role === "admin") {
          return res.status(403).json({
            error: "Admin accounts cannot use Google login",
          });
        }

        // Update existing user with googleId if not already set
        if (!user.googleId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              googleId: true,
            },
          });
        }
      } else {
        // Create new user with Google auth
        user = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            username: firstName,
            googleId,
            role: "client", // Google users are always clients
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            googleId: true,
          },
        });
      }

      const accessToken = jwt.sign(
        {
          id: user.id,
          role: user.role,
        },
        authConfig.secret,
        {
          expiresIn: authConfig.expiresIn,
        }
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1440 * 60 * 1000,
        sameSite: "strict",
      });

      return res.status(200).json({ user });
    } catch (error) {
      console.error("Google callback error:", error);
      return res.status(500).json({
        message: "Internal server error",
        error: error.message,
      });
    }
  },

  async logout(req, res) {
    try {
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(204).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
