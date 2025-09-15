import dotenv from "dotenv";
dotenv.config();

const authConfig = {
  secret: process.env.AUTH_SECRET || "default_secret_key",
  expiresIn: process.env.AUTH_SECRET_EXPIRES_IN || "1d",
};

export default authConfig;
