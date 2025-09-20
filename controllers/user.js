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
          firstName: true,
          lastName: true,
          email: true,
          password: true,
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

      if (updatedData.email) {
        const checkEmail = await validateEmailUnique(updatedData.email, userId);
        if (!checkEmail.valid) {
          return res.status(409).json({ error: checkEmail.error });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updatedData,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          updatedAt: true,
        },
      });

      return res.status(200).json({ updatedUser });
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

      await prisma.user.delete({ where: { id } });
      return res.status(204).end();
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
};
