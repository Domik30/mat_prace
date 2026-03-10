// apps/server/src/index.ts
import "dotenv/config";
// Use Czech Republic timezone for course scheduling (live_at) and group unlock
if (!process.env.TZ) process.env.TZ = "Europe/Prague";
import cors from "cors";
import express from "express";
import path from "path";

import { initDatabase } from "./db/index.js";
import { startScheduler } from "./services/scheduler.service.js";
import { courseRoutes } from "./routes/courses.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { loginRoutes } from "./routes/login.js";

const app = express();

// Middleware
app.use(express.json());

// Normalize accidental duplicate /api prefix
// If an incoming request path starts with /api/api or /api/api/, rewrite it to /api/....
// This avoids 404 HTML errors when the frontend accidentally prefixes /api twice.
app.use((req, _res, next) => {
    if (typeof req.url === "string") {
        // handle "/api/api/..." and "/api/api" (root)
        if (req.url === "/api/api" || req.url === "/api/api/") {
            req.url = "/api";
        } else if (req.url.startsWith("/api/api/")) {
            req.url = req.url.replace(/^\/api\/api\//, "/api/");
        }
    }
    next();
});

// Serve uploaded materials (static)
const uploadsPath = path.join(process.cwd(), "apps", "server", "uploads");
app.use("/uploads", express.static(uploadsPath));

// CORS – allow local dev + deployed tourde.app frontends (including previews)
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow non-browser clients or same-origin requests with no Origin header
            if (!origin) {
                return callback(null, true);
            }

            const allowedExact = new Set([
                "http://localhost:3001",
                "http://localhost:3002",
                "http://localhost:5173",
                "https://gothaj-4628.tourde.app",
            ]);

            if (allowedExact.has(origin)) {
                return callback(null, true);
            }

            // Allow preview / ephemeral frontends like https://gothaj-4628-xxxx.tourde.app
            const tourdeMatch = /^https:\/\/gothaj-4628-[a-zA-Z0-9-]+\.tourde\.app$/.test(origin);
            if (tourdeMatch) {
                return callback(null, true);
            }

            return callback(new Error(`Not allowed by CORS: ${origin}`));
        },
        credentials: true,
    })
);

// API routes
app.use("/api/courses", courseRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/login", loginRoutes);

// NO static serving or catch-all in development!
// The frontend is served by Vite dev server

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
    try {
        await initDatabase();
        startScheduler();
        console.log("Database initialized successfully");

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`Backend API running at http://localhost:${PORT}`);
            console.log(`Frontend should be run with Vite on port 3001/3002/5173`);
        });
    } catch (err) {
        console.error("Failed to start server:", err);
        process.exit(1);
    }
}

startServer();