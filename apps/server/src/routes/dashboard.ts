import { Router } from "express";
import { requireDashboard } from "../auth.js";
import {
    getCourses,
    getCourseByUuid,
    createCourse,
    updateCourse,
    deleteCourse,
} from "../controllers/dashboard.controller.js";

import * as coursesController from "../controllers/courses.controller.js";
import * as materialsController from "../controllers/materials.controller.js";
import * as quizzesController from "../controllers/quizzes.controller.js";
import * as feedController from "../controllers/feed.controller.js";
import * as modulesController from "../controllers/modules.controller.js";
import * as presetsController from "../controllers/presets.controller.js";
import * as analyticsController from "../controllers/analytics.controller.js";

import fs from "fs";
import path from "path";

const catchAsync = (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export const dashboardRoutes = Router();

dashboardRoutes.use(requireDashboard);

// prepare uploads directory for materials (shared with course routes)
const uploadsRoot = path.join(process.cwd(), "apps", "server", "uploads", "materials");
fs.mkdirSync(uploadsRoot, { recursive: true });

import multer from "multer";
import type { Request } from "express";
import type { FileFilterCallback } from "multer";

const storage = multer.diskStorage({
    destination: function (
        _req: Request,
        _file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) {
        cb(null, uploadsRoot);
    },

    filename: function (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) {
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

/**
 * Wrap multer.single so we can convert multer errors (like LIMIT_FILE_SIZE)
 * into JSON responses with status 400.
 */
const uploadSingle = (fieldName: string) => (req: any, res: any, next: any) => {
    upload.single(fieldName)(req, res, (err: any) => {
        if (err) {
            if (err && err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({ error: "File too large" });
            }
            return next(err);
        }
        return next();
    });
};

// Courses (dashboard CRUD)
dashboardRoutes.get("/courses", catchAsync(getCourses));
dashboardRoutes.get("/courses/:uuid", catchAsync(getCourseByUuid));
dashboardRoutes.post("/courses", catchAsync(createCourse));
dashboardRoutes.put("/courses/:uuid", catchAsync(updateCourse));
dashboardRoutes.delete("/courses/:uuid", catchAsync(deleteCourse));
dashboardRoutes.patch("/courses/:uuid/publish", catchAsync(coursesController.setPublishState));
dashboardRoutes.patch("/courses/:uuid/state", catchAsync(coursesController.setState));
dashboardRoutes.patch("/courses/:uuid/live-at", catchAsync(coursesController.setLiveAt));
dashboardRoutes.post("/courses/:uuid/duplicate", catchAsync(coursesController.duplicateCourse));
dashboardRoutes.get("/courses/:uuid/analytics", catchAsync(analyticsController.getCourseStats));

// Groups management (dashboard)
dashboardRoutes.get("/courses/:uuid/groups", catchAsync(modulesController.listForCourse));
dashboardRoutes.post("/courses/:uuid/groups", catchAsync(modulesController.create));
dashboardRoutes.put("/courses/:uuid/groups", catchAsync(modulesController.reorder));
dashboardRoutes.put("/courses/:uuid/groups/:groupId", catchAsync(modulesController.update));
dashboardRoutes.delete("/courses/:uuid/groups/:groupId", catchAsync(modulesController.remove));
dashboardRoutes.patch("/courses/:uuid/groups/:groupId/unlock", catchAsync(modulesController.setUnlockState));
dashboardRoutes.patch("/courses/:uuid/groups/:groupId/scheduled-unlock", catchAsync(modulesController.setScheduledUnlockAt));

// Materials management (dashboard)
dashboardRoutes.get("/courses/:uuid/materials", catchAsync(materialsController.getAll));
dashboardRoutes.post(
    "/courses/:uuid/materials",
    uploadSingle("file"),
    catchAsync(materialsController.create)
);
dashboardRoutes.put(
    "/courses/:uuid/materials/:materialId",
    uploadSingle("file"),
    catchAsync(materialsController.update)
);
dashboardRoutes.delete(
    "/courses/:uuid/materials/:materialId",
    catchAsync(materialsController.remove)
);
dashboardRoutes.patch(
    "/courses/:uuid/materials/:materialId/group",
    catchAsync(materialsController.setModule)
);

// Quizzes management (dashboard)
dashboardRoutes.get("/courses/:uuid/quizzes", catchAsync(quizzesController.listForCourse));
dashboardRoutes.post("/courses/:uuid/quizzes", catchAsync(quizzesController.create));
dashboardRoutes.get("/courses/:uuid/quizzes/:quizId", catchAsync(quizzesController.getOne));
dashboardRoutes.get("/courses/:uuid/quizzes/:quizId/stats", catchAsync(quizzesController.getStats));
dashboardRoutes.get("/courses/:uuid/quizzes/:quizId/participant-answers", catchAsync(quizzesController.getParticipantAnswers));
dashboardRoutes.put("/courses/:uuid/quizzes/:quizId", catchAsync(quizzesController.update));
dashboardRoutes.delete("/courses/:uuid/quizzes/:quizId", catchAsync(quizzesController.remove));
dashboardRoutes.patch("/courses/:uuid/quizzes/:quizId/group", catchAsync(quizzesController.setModule));

// Feed management (dashboard)
dashboardRoutes.get("/courses/:uuid/feed", catchAsync(feedController.listForCourse));
dashboardRoutes.post("/courses/:uuid/feed", catchAsync(feedController.createManual));
dashboardRoutes.put("/courses/:uuid/feed/:postId", catchAsync(feedController.update));
dashboardRoutes.delete("/courses/:uuid/feed/:postId", catchAsync(feedController.remove));
dashboardRoutes.patch("/courses/:uuid/feed/:postId/group", catchAsync(feedController.setModule));

// Presets management
dashboardRoutes.get("/presets/materials", catchAsync(presetsController.listMaterialPresets));
dashboardRoutes.get("/presets/materials/:uuid", catchAsync(presetsController.getMaterialPreset));
dashboardRoutes.post("/presets/materials", catchAsync(presetsController.createMaterialPreset));
dashboardRoutes.put("/presets/materials/:uuid", catchAsync(presetsController.updateMaterialPreset));
dashboardRoutes.delete("/presets/materials/:uuid", catchAsync(presetsController.deleteMaterialPreset));

dashboardRoutes.get("/presets/quizzes", catchAsync(presetsController.listQuizPresets));
dashboardRoutes.get("/presets/quizzes/:uuid", catchAsync(presetsController.getQuizPreset));
dashboardRoutes.post("/presets/quizzes", catchAsync(presetsController.createQuizPreset));
dashboardRoutes.put("/presets/quizzes/:uuid", catchAsync(presetsController.updateQuizPreset));
dashboardRoutes.delete("/presets/quizzes/:uuid", catchAsync(presetsController.deleteQuizPreset));

dashboardRoutes.get("/presets/feeds", catchAsync(presetsController.listFeedPresets));
dashboardRoutes.get("/presets/feeds/:uuid", catchAsync(presetsController.getFeedPreset));
dashboardRoutes.post("/presets/feeds", catchAsync(presetsController.createFeedPreset));
dashboardRoutes.put("/presets/feeds/:uuid", catchAsync(presetsController.updateFeedPreset));
dashboardRoutes.delete("/presets/feeds/:uuid", catchAsync(presetsController.deleteFeedPreset));
