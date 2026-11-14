import express from "express";
import logger from "#config/logger.js";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "#routes/auth.routes.js";
import securityMiddleware from "#middleware/security.middleware.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(morgan("combined", { stream: { write: (message) => logger.info(message.trim()) } }));

app.use(securityMiddleware); // Apply security middleware globally


app.get("/", (req, res) => {
    logger.info("Hello acquisitions");
    res.status(200).send("Hello acquisitions");
});

app.get("/health", (req, res) => {
    logger.info("Health check");
    res.status(200).json({ status: "ok",timestamp: new Date().toISOString(),uptime: process.uptime() });
});

app.get('/api', (req, res) => {
    logger.info("API check");
    res.status(200).json({message: "API is working", timestamp: new Date().toISOString() });
});

app.use('/api/auth',authRoutes);

export default app;