// controllers/user.js
import prisma from "../lib/prisma.js";
import { validateEmailUnique } from "../utils/validation.js";

export const userController = {
  async getUserInfo(req, res) {
    try {
      const id = req.userId;

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateUserInfo(req, res) {
    try {
      const userId = req.userId;
      const updatedData = req.validatedData;

      // Prevent changing role via regular update
      if (updatedData.role) {
        delete updatedData.role;
      }

      if (updatedData.email) {
        const checkEmail = await validateEmailUnique(updatedData.email, userId);
        if (!checkEmail.valid) {
          return res.status(409).json({ error: checkEmail.error });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: updatedData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({ user });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal server error", error: error || null });
    }
  },

  async deleteUserInfo(req, res) {
    try {
      const id = req.userId;
      const user = await prisma.user.findUnique({ where: { id } });

      // Prevent deleting admin user
      if (user.role === "admin") {
        return res.status(403).json({
          error: "Cannot delete admin account",
        });
      }

      await prisma.user.delete({ where: { id } });
      return res.status(204).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  // Admin-only methods
  async getAllUsers(req, res) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          googleId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json({ users });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },

  async updateUserRole(req, res) {
    try {
      const { userId, role } = req.validatedData;

      // Prevent changing admin role
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (targetUser.role === "admin") {
        return res.status(403).json({
          error: "Cannot change admin role",
        });
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({ user });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
