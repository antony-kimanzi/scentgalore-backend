import express from "express";
import cors from "cors";
import morgan from "morgan";
import mainRouter from "./routes/index.js";
import appConfig from "./config/appConfig.js";
import cookieParser from "cookie-parser";

const app = express();

// MIDDLEWARE //

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.use(cors());

// ROUTES //
app.use("/api", mainRouter);

const port = appConfig.port;
const host = appConfig.host;

app.listen(port, host, () =>
  console.log(`server started on http://${host}:${port}`)
);
