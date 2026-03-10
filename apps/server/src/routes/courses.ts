// src/routes/courses.ts
import { Router } from "express";
import { requireDashboard, authOptional } from "../auth.js";
import {
    getAll,
    getAllForCatalog,
    getOne,
    create,
    update,
    remove,
} from "../controllers/courses.controller.js";
import * as materialsController from "../controllers/materials.controller.js";
import * as quizzesController from "../controllers/quizzes.controller.js";
import * as feedController from "../controllers/feed.controller.js";
import * as courseStateController from "../controllers/courseState.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";

import multer from "multer";
import path from "path";
import fs from "fs";

const catchAsync = (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const courseRoutes = Router();

// prepare uploads directory for materials
const uploadsRoot = path.join(process.cwd(), "apps", "server", "uploads", "materials");
fs.mkdirSync(uploadsRoot, { recursive: true });

// multer storage
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadsRoot);
    },
    filename: function (_req, file, cb) {
        // keep original extension but unique name
        const ext = path.extname(file.originalname);
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, unique);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 30 * 1024 * 1024, // 30 MB
    },
});

const uploadSingle = (fieldName: string) => (req: any, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
        if (err) {
            // Check multer's error code string (avoid instanceof checks)
            if (err && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large" });
            }
            // propagate other multer errors to the global error handler
            return next(err);
        }
        return next();
    });
};

// Public catalog: only live courses visible to students
courseRoutes.get("/", catchAsync(getAllForCatalog));

// Catalog SSE – notifies when any course becomes live (students refresh list)
courseRoutes.get("/catalog/stream", courseStateController.streamCatalog);

// course state (unlocking) SSE stream - must be before /:uuid route
courseRoutes.get("/:uuid/state/stream", courseStateController.stream);

courseRoutes.get("/:uuid", catchAsync(getOne));

// Analytics (record events - student-facing)
courseRoutes.post("/:uuid/events", authOptional, catchAsync(analyticsController.recordEvent));

// materials endpoints (nested)
// GET materials — public
courseRoutes.get("/:uuid/materials", catchAsync(materialsController.getAll));

// POST material — protected
courseRoutes.post(
    "/:uuid/materials",
    requireDashboard,
    uploadSingle("file"),
    catchAsync(materialsController.create)
);

// PUT material — protected
courseRoutes.put(
    "/:uuid/materials/:materialId",
    requireDashboard,
    uploadSingle("file"),
    catchAsync(materialsController.update)
);

// DELETE material — protected
courseRoutes.delete(
    "/:uuid/materials/:materialId",
    requireDashboard,
    catchAsync(materialsController.remove)
);

// quizzes endpoints
courseRoutes.get("/:uuid/quizzes", catchAsync(quizzesController.listForCourse));
courseRoutes.post("/:uuid/quizzes", requireDashboard, catchAsync(quizzesController.create));
courseRoutes.get("/:uuid/quizzes/:quizId", catchAsync(quizzesController.getOne));
courseRoutes.put("/:uuid/quizzes/:quizId", requireDashboard, catchAsync(quizzesController.update));
courseRoutes.delete("/:uuid/quizzes/:quizId", requireDashboard, catchAsync(quizzesController.remove));
courseRoutes.post("/:uuid/quizzes/:quizId/submit", authOptional, catchAsync(quizzesController.submit));

// feed endpoints
courseRoutes.get("/:uuid/feed", catchAsync(feedController.listForCourse));
courseRoutes.post("/:uuid/feed", requireDashboard, catchAsync(feedController.createManual));
courseRoutes.put("/:uuid/feed/:postId", requireDashboard, catchAsync(feedController.update));
courseRoutes.delete("/:uuid/feed/:postId", requireDashboard, catchAsync(feedController.remove));
courseRoutes.get("/:uuid/feed/stream", feedController.stream);

courseRoutes.post("/", requireDashboard, catchAsync(create));
courseRoutes.put("/:uuid", requireDashboard, catchAsync(update));
courseRoutes.delete("/:uuid", requireDashboard, catchAsync(remove));