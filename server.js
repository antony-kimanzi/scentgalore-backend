import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import morgan from "morgan";
import mainRouter from "./routes/index.js";

dotenv.config();

const app = express();

// MIDDLEWARE //

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// ROUTES //
app.use("/api", mainRouter);

const port = process.env.PORT || 3001;

app.listen(port, () => console.log(`server started on port ${port}`));
