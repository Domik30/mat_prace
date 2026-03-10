// src/controllers/dashboard.controller.ts
import type { Request, Response } from "express";
import * as service from "../services/courses.service.js";
import * as materialsService from "../services/materials.service.js";
import * as quizzesService from "../services/quizzes.service.js";
import * as feedService from "../services/feed.service.js";
import * as modulesService from "../services/modules.service.js";

export const getCourses = async (_req: Request, res: Response) => {
    const courses = await service.getAll();
    const withCounts = await Promise.all(
        (courses as any[]).map(async (c) => {
            const [mats, quizs, feeds] = await Promise.all([
                materialsService.getAllForCourse(c.uuid),
                quizzesService.listForCourse(c.uuid),
                feedService.listForCourse(c.uuid),
            ]);
            return {
                ...c,
                materialsCount: mats?.length ?? 0,
                quizzesCount: quizs?.length ?? 0,
                feedsCount: feeds?.length ?? 0,
            };
        })
    );
    res.json(withCounts);
};

export const getCourseByUuid = async (req: Request, res: Response) => {
    const course = await service.getOne(req.params.uuid);
    if (!course) return res.status(404).json({ error: "Course not found" });

    const [materials, quizzes, feed, groups] = await Promise.all([
        materialsService.getAllForCourse(req.params.uuid),
        quizzesService.listForCourse(req.params.uuid),
        feedService.listForCourse(req.params.uuid),
        modulesService.listForCourse(req.params.uuid),
    ]);

    const groupsWithItems = groups.map((g: any) => ({
        ...g,
        materials: materials.filter((m: any) => m.moduleUuid === g.uuid),
        quizzes: quizzes.filter((q: any) => q.moduleUuid === g.uuid),
        feed: feed.filter((f: any) => f.moduleUuid === g.uuid),
    }));

    (course as any).groups = groupsWithItems;
    (course as any).materials = materials;
    (course as any).quizzes = quizzes;
    (course as any).feed = feed;

    res.json(course);
};

export const createCourse = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const course = await service.create({ name, description });
    res.status(201).json(course);
};

export const updateCourse = async (req: Request, res: Response) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Name required" });

    const updated = await service.update(req.params.uuid, { name, description });
    if (!updated) return res.status(404).json({ error: "Course not found" });
    res.json(updated);
};

export const deleteCourse = async (req: Request, res: Response) => {
    const uuid = req.params.uuid;
    const deleted = await service.remove(uuid);
    if (!deleted) return res.status(404).json({ error: "Course not found" });
    const { notify } = await import("../services/courseState.service.js");
    notify(uuid, { type: "course-deleted" });
    res.json({ success: true });
};