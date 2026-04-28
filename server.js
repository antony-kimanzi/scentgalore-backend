import express from "express";
import cors from "cors";
import morgan from "morgan";
import mainRouter from "./routes/index.js";
import appConfig from "./config/appConfig.js";
import cookieParser from "cookie-parser";

const app = express();

// CORS configuration - make it more permissive for testing
// In server.js, update CORS:
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Allow all localhost origins
    if (/^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    // Add your production domain here
    callback(null, true); // For now, allow all origins for testing
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  exposedHeaders: ["Set-Cookie"],
  maxAge: 86400,
};

// MIDDLEWARE //
app.use(cors(corsOptions)); // Apply CORS first
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Test route to verify server is working
app.get("/", (req, res) => {
  res.json({
    message: "Backend server is running!",
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// ROUTES //
app.use("/api", mainRouter);

const PORT = appConfig.port;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`server started on http://0.0.0.0:${PORT}`);
});
