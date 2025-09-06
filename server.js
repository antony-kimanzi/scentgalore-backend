import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import executeMigrations from "./migrations/runMigrations.js";

dotenv.config();

const app = express();

// MIDDLEWARE //
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

async function startServer() {
  try {
    if (process.env.NODE_ENV !== "production") executeMigrations();

    const port = process.env.PORT || 3001;

    app.listen(port, () => console.log(`Server is running in port ${port}`));
    
  } catch (error) {
    console.log("failed to start server:", error);
    process.exit(1);
  }
}
