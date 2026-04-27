import prisma from "../lib/prisma.js";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import authConfig from "../config/authConfig.js";

const client = new OAuth2Client();

export const googleAuthController = {
  async authenticate(req, res) {
    try {
      const { token } = req.validatedData;

      // Debug: log the token start to see what we're working with
      console.log(
        "Received Google token (first 100 chars):",
        token.substring(0, 100)
      );

      // Option 1: Verify without audience (let Google library determine it from token)
      const ticket = await client.verifyIdToken({
        idToken: token,
        // Don't specify audience here, let the library extract it from the token
      });

      const payload = ticket.getPayload();

      // Debug: show the audience from the token
      console.log("Token audience:", payload.aud);
      console.log("Token issuer:", payload.iss);
      console.log("Token issued for email:", payload.email);

      const {
        sub: googleId,
        email,
        given_name: firstName,
        family_name: lastName,
        name,
      } = payload;

      // Generate base username from first name or name
      const baseUsername = firstName || name?.split(" ")[0] || "User";
      let username = baseUsername.toLowerCase();

      // Clean up username: remove special characters, only allow letters, numbers, underscores
      username = username.replace(/[^a-z0-9_]/g, "_");

      // Check if username exists and generate a unique one if needed
      let usernameExists = await prisma.user.findUnique({
        where: { username },
      });

      let counter = 1;
      const originalUsername = username; // Save original for prefix
      while (usernameExists) {
        username = `${originalUsername}${counter}`;
        usernameExists = await prisma.user.findUnique({
          where: { username },
        });
        counter++;
        // Safety limit to prevent infinite loop
        if (counter > 100) {
          // Fallback: use email prefix + random string
          const emailPrefix = email.split("@")[0].toLowerCase();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          username = `${emailPrefix}_${randomSuffix}`;
          // Check this one too
          usernameExists = await prisma.user.findUnique({
            where: { username },
          });
          if (!usernameExists) break;
        }
      }

      let user = await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
      });

      if (!user) {
        console.log(`Creating new user with username: ${username}`);
        user = await prisma.user.create({
          data: {
            googleId,
            email,
            firstName: firstName || name?.split(" ")[0] || "User",
            lastName: lastName || name?.split(" ").slice(1).join(" ") || "",
            username: username, // USE THE GENERATED UNIQUE USERNAME HERE
            password: null,
          },
        });
      } else if (!user.googleId) {
        // Update existing user with Google ID if they don't have one
        console.log(`Updating existing user with Google ID: ${user.id}`);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }

      const accessToken = jwt.sign({ id: user.id }, authConfig.secret, {
        expiresIn: authConfig.expiresIn,
      });

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1440 * 60 * 1000,
        sameSite: "strict",
      });

      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Google authentication error:", error);

      // Handle specific Prisma constraint errors
      if (error.code === "P2002") {
        return res.status(409).json({
          message: "Username already exists. Please try again.",
          error: "Duplicate username",
          suggestion:
            "The system tried to generate a unique username but failed. Please try a different Google account or contact support.",
        });
      }

      return res.status(500).json({
        message: "Google authentication failed",
        error: error.message,
      });
    }
  },
};
