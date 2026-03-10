import * as service from "../services/courses.service.js";
import * as materialsService from "../services/materials.service.js";
import * as quizzesService from "../services/quizzes.service.js";
import * as feedService from "../services/feed.service.js";
import * as modulesService from "../services/modules.service.js";
import * as courseState from "../services/courseState.service.js";
import type { Request, Response } from "express";

export const getAll = async (_req: Request, res: Response) => {
    const courses = await service.getAll();
    res.json(courses);
};

/** Public catalog: live, scheduled, and paused courses visible; only live can be opened */
export const getAllForCatalog = async (_req: Request, res: Response) => {
    const courses = await service.getAllForCatalog();
    res.json(courses);
};

export const getOne = async (req: Request, res: Response) => {
    const course = await service.getOne(req.params.uuid);
    if (!course) return res.status(404).json({ error: "Course not found" });
    if ((course as any).state !== "live") return res.status(404).json({ error: "Course not found" });

    const userId = (req as any).user?.userId as number | undefined;

    // Attach materials, quizzes, feed, and groups for the course
    const [materials, quizzes, feed, groups] = await Promise.all([
        materialsService.getAllForCourse(req.params.uuid),
        quizzesService.listForCourse(req.params.uuid, userId),
        feedService.listForCourse(req.params.uuid),
        modulesService.listForCourse(req.params.uuid),
    ]);

    // Build groups with their items
    const groupsWithItems = groups.map((g) => ({
        ...g,
        materials: materials.filter((m: any) => m.moduleUuid === g.uuid),
        quizzes: quizzes.filter((q: any) => q.moduleUuid === g.uuid),
        feed: feed.filter((f: any) => f.moduleUuid === g.uuid),
    }));

    // Only expose unlocked groups to students (including "Nezařazené" if unlocked)
    const visibleGroups = groupsWithItems.filter((g) => g.isUnlocked);

    (course as any).groups = visibleGroups;
    // Keep flat lists for backward compatibility
    (course as any).materials = materials;
    (course as any).quizzes = quizzes;
    (course as any).feed = feed;

    res.json(course);
};

export const create = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const course = await service.create({ name, description });
    res.status(200).json(course);
};

export const update = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const updated = await service.update(req.params.uuid, { name, description });
    if (!updated) return res.status(404).json({ error: "Course not found" });
    
    // Notify SSE subscribers about course update
    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "course-updated",
    });
    
    res.json(updated);
};

export const remove = async (req: Request, res: Response) => {
    const deleted = await service.remove(req.params.uuid);
    if (!deleted) return res.status(404).json({ error: "Course not found" });
    res.status(204).send();
};

export const setPublishState = async (req: Request, res: Response) => {
    const { isPublished } = req.body as { isPublished?: boolean };
    if (typeof isPublished !== "boolean") {
        return res.status(400).json({ error: "isPublished boolean is required" });
    }

    const updated = await service.setPublishState(req.params.uuid, isPublished);
    if (!updated) return res.status(404).json({ error: "Course not found" });
    res.json(updated);
};

export const setState = async (req: Request, res: Response) => {
    const { state } = req.body as { state?: string };
    const valid = ["draft", "scheduled", "live", "paused", "archived"];
    if (!state || !valid.includes(state)) {
        return res.status(400).json({ error: "state must be one of: " + valid.join(", ") });
    }

    const course = await service.getOne(req.params.uuid);
    if (course && (course as any).state === "live" && state === "scheduled") {
        return res.status(400).json({ error: "Cannot set state to scheduled when course is live" });
    }

    const updated = await service.setState(req.params.uuid, state as import("../services/courses.service.js").CourseState);
    if (!updated) return res.status(404).json({ error: "Course not found" });

    courseState.notify(req.params.uuid, { type: "course-state-changed", state });

    res.json(updated);
};

export const setLiveAt = async (req: Request, res: Response) => {
    const { liveAt } = req.body as { liveAt?: string | null };
    const value = liveAt == null || liveAt === "" ? null : String(liveAt).trim();
    if (value !== null && !/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(value)) {
        return res.status(400).json({ error: "Invalid date for liveAt (expected YYYY-MM-DDTHH:mm or YYYY-MM-DD HH:mm)" });
    }

    const updated = await service.setLiveAt(req.params.uuid, value);
    if (!updated) return res.status(404).json({ error: "Course not found" });

    courseState.notify(req.params.uuid, { type: "refresh", reason: "live-at-updated" });

    res.json(updated);
};

export const duplicateCourse = async (req: Request, res: Response) => {
    const duplicated = await service.duplicate(req.params.uuid);
    if (!duplicated) return res.status(404).json({ error: "Course not found" });
    res.status(201).json(duplicated);
};