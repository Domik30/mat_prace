import type { Request, Response } from "express";
import * as service from "../services/feed.service.js";
import * as modulesService from "../services/modules.service.js";
import * as courseState from "../services/courseState.service.js";

export const listForCourse = async (req: Request, res: Response) => {
    const feed = await service.listForCourse(req.params.uuid);
    res.json(feed);
};

export const createManual = async (req: Request, res: Response) => {
    const { message, moduleUuid } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    // If no moduleUuid provided, assign to "Nezařazené" group
    let finalModuleUuid = moduleUuid || null;
    if (!finalModuleUuid) {
        const ungroupedGroup = await modulesService.getOrCreateUngroupedGroup(req.params.uuid);
        finalModuleUuid = ungroupedGroup.uuid;
    }

    const item = await service.createManualPost(req.params.uuid, message, finalModuleUuid);
    res.status(200).json(item);
};

export const update = async (req: Request, res: Response) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });

    const item = await service.updatePost(req.params.uuid, req.params.postId, message);
    if (!item) return res.status(404).json({ error: "Post not found" });
    res.json(item);
};

export const remove = async (req: Request, res: Response) => {
    const deleted = await service.removePost(req.params.uuid, req.params.postId);
    if (!deleted) return res.status(404).json({ error: "Post not found" });
    res.status(204).send();
};

export const setModule = async (req: Request, res: Response) => {
    const { moduleUuid } = req.body as { moduleUuid?: string | null };
    const item = await service.setModule(req.params.uuid, req.params.postId, moduleUuid ?? null);
    if (!item) return res.status(404).json({ error: "Post not found" });

    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "feed-moved",
        entityType: "feed",
        uuid: req.params.postId,
    });

    res.json(item);
};

export const stream = (req: Request, res: Response) => {
    const courseUuid = req.params.uuid;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders?.();
    res.write("retry: 5000\n\n");

    service.addSubscriber(courseUuid, res);

    const keepAlive = setInterval(() => {
        res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
        clearInterval(keepAlive);
        service.removeSubscriber(courseUuid, res);
        res.end();
    });
};