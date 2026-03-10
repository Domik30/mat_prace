import type { Request, Response } from "express";
import * as service from "../services/modules.service.js";
import * as courseState from "../services/courseState.service.js";

export const listForCourse = async (req: Request, res: Response) => {
    const modules = await service.listForCourse(req.params.uuid);
    res.json(modules);
};

export const create = async (req: Request, res: Response) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const group = await service.create(req.params.uuid, { title, description });
    if (!group) {
        return res.status(500).json({ error: "Failed to create group" });
    }

    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "group-created",
        entityType: "module",
        uuid: group.uuid,
    });

    res.status(201).json(group);
};

export const update = async (req: Request, res: Response) => {
    const { title, description, sortOrder, scheduledUnlockAt } = req.body;
    const scheduledStr = scheduledUnlockAt != null && scheduledUnlockAt !== "" ? String(scheduledUnlockAt) : null;
    const updated = await service.update(req.params.groupId, {
        title,
        description,
        sortOrder: typeof sortOrder === "number" ? sortOrder : undefined,
        scheduledUnlockAt: scheduledStr,
    });
    if (!updated) return res.status(404).json({ error: "Group not found" });

    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "group-updated",
        entityType: "module",
        uuid: updated.uuid,
    });

    res.json(updated);
};

export const remove = async (req: Request, res: Response) => {
    const deleted = await service.remove(req.params.groupId);
    if (!deleted) return res.status(404).json({ error: "Group not found" });

    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "group-removed",
        entityType: "module",
        uuid: req.params.groupId,
    });

    res.status(204).send();
};

export const setUnlockState = async (req: Request, res: Response) => {
    const { isUnlocked } = req.body;
    if (typeof isUnlocked !== "boolean") {
        return res.status(400).json({ error: "isUnlocked boolean is required" });
    }

    const updated = await service.setUnlockState(req.params.groupId, isUnlocked);
    if (!updated) return res.status(404).json({ error: "Group not found" });

    courseState.notify(req.params.uuid, {
        type: "unlock",
        entityType: "module",
        uuid: updated.uuid,
        isUnlocked: updated.isUnlocked,
        unlockedAt: updated.unlockedAt,
    });

    res.json(updated);
};

export const setScheduledUnlockAt = async (req: Request, res: Response) => {
    const { scheduledUnlockAt } = req.body as { scheduledUnlockAt?: string | null };
    const value = scheduledUnlockAt == null || scheduledUnlockAt === "" ? null : String(scheduledUnlockAt);

    const updated = await service.setScheduledUnlockAt(req.params.groupId, value);
    if (!updated) return res.status(404).json({ error: "Group not found" });

    if (updated.isUnlocked) {
        courseState.notify(req.params.uuid, {
            type: "unlock",
            entityType: "module",
            uuid: updated.uuid,
            isUnlocked: updated.isUnlocked,
            unlockedAt: updated.unlockedAt ?? undefined,
        });
    } else {
        courseState.notify(req.params.uuid, { type: "refresh", reason: "scheduled-unlock-set", entityType: "module", uuid: updated.uuid });
    }

    res.json(updated);
};

export const reorder = async (req: Request, res: Response) => {
    const { orderedUuids } = req.body as { orderedUuids?: string[] };
    if (!Array.isArray(orderedUuids)) {
        return res.status(400).json({ error: "orderedUuids array is required" });
    }

    const groups = await service.reorder(req.params.uuid, orderedUuids);
    res.json(groups);
};