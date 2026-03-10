import type { Request, Response } from "express";
import * as courseState from "../services/courseState.service.js";

/** SSE stream for course catalog – notifies when any course becomes live so students can refresh */
export const streamCatalog = (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    (res as any).flushHeaders?.();
    res.write("retry: 5000\n\n");

    courseState.addCatalogSubscriber(res);

    const keepAlive = setInterval(() => {
        res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
        clearInterval(keepAlive);
        courseState.removeCatalogSubscriber(res);
        res.end();
    });
};

export const stream = (req: Request, res: Response) => {
    const courseUuid = req.params.uuid;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    (res as any).flushHeaders?.();
    res.write("retry: 5000\n\n");

    courseState.addSubscriber(courseUuid, res);

    const keepAlive = setInterval(() => {
        res.write(": keep-alive\n\n");
    }, 15000);

    req.on("close", () => {
        clearInterval(keepAlive);
        courseState.removeSubscriber(courseUuid, res);
        res.end();
    });
};

