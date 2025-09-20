import prisma from "../lib/prisma.js";
import { passwordUtils } from "../utils/password.js";
import jwt from "jsonwebtoken";
import authConfig from "../config/authConfig.js";
import { validateEmailUnique } from "../utils/validation.js";

export const authController = {
  async login(req, res) {
    try {
      const { email, password } = req.validatedData;

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: "User not found",
        });
      }

      let correctPassword;
      try {
        correctPassword = await passwordUtils.comparePassword(
          password,
          user.password
        );
      } catch (error) {
        return res.status(500).json({ error: "Authentication error" });
      }

      if (!correctPassword) {
        return res.status(409).json({ error: "Incorrect password" });
      }

      const accessToken = jwt.sign({ id: user.id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true, // Ensure the cookie cannot be accessed via JavaScript (security against XSS attacks)
        secure: process.env.NODE_ENV === "production", // Set to true in production for HTTPS-only cookies
        maxAge: 1440 * 60 * 1000, // 1440 minutes (24 hours) in mileseconds
        sameSite: "strict", // Ensures the cookie is sent only with requests from the same site
      });

      return res.status(200).json({ user });
    } catch (error) {
      return res.status(500).json({
        message: "Internal server error",
        error: error || null,
      });
    }
  },

  async register(req, res) {
    try {
      const { email, firstName, lastName, password } = req.validatedData;

      const user = await prisma.user.findFirst({ where: { email } });

      if (user) {
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
          email: email,
          password: hashedPassword,
        },
      });

      const createdUser = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          password: true,
          createdAt: true,
        },
      });

      const accessToken = jwt.sign({ id: createdUser.id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true, // Ensure the cookie cannot be accessed via JavaScript (security against XSS attacks)
        secure: process.env.NODE_ENV === "production", // Set to true in production for HTTPS-only cookies
        maxAge: 1440 * 60 * 1000, // 1440 minutes (24 hours) in mileseconds
        sameSite: "strict", // Ensures the cookie is sent only with requests from the same site
      });

      return res.status(201).json({ createdUser, token });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error", error: error || null });
    }
  },

  async logout(req, res) {
    try {
      res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      return res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },
};
