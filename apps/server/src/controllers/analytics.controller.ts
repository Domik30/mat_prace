import type { Request, Response } from "express";
import * as analyticsService from "../services/analytics.service.js";
import * as courseState from "../services/courseState.service.js";

const VALID_TYPES: analyticsService.CourseEventType[] = [
    "material_download",
    "link_click",
    "course_open",
];

export async function recordEvent(req: Request, res: Response) {
    const { eventType, materialUuid } = req.body as { eventType?: string; materialUuid?: string };
    if (!eventType || !VALID_TYPES.includes(eventType as analyticsService.CourseEventType)) {
        return res.status(400).json({ error: "eventType must be one of: " + VALID_TYPES.join(", ") });
    }

    const userId = (req as any).user?.userId as number | undefined;

    await analyticsService.recordEvent(req.params.uuid, eventType as analyticsService.CourseEventType, {
        userId: userId ?? null,
        materialUuid: materialUuid ?? null,
    });

    // Notify SSE subscribers (dashboard + students) so analytics can update live
    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "analytics-updated",
        entityType: materialUuid ? "material" : undefined,
        uuid: materialUuid ?? undefined,
    });

    res.status(204).send();
}

export async function getCourseStats(req: Request, res: Response) {
    const stats = await analyticsService.getCourseStats(req.params.uuid);
    res.json(stats);
}
