import type { Response } from "express";

/** Event sent when any course becomes live (for catalog refresh) */
export type CatalogEvent = { type: "course-state-changed"; state: string; courseUuid?: string };

type CourseStateEvent =
    | {
    type: "unlock";
    entityType: "module" | "material" | "quiz";
    uuid: string;
    isUnlocked: boolean;
    unlockedAt?: string | null;
}
    | {
    type: "refresh";
    reason: string;
    entityType?: "module" | "material" | "quiz" | "feed";
    uuid?: string;
}
    | {
    type: "course-state-changed";
    state: string;
}
    | { type: "course-deleted" };

const subscribers = new Map<string, Set<Response>>();
const catalogSubscribers = new Set<Response>();

export function addCatalogSubscriber(res: Response) {
    catalogSubscribers.add(res);
}

export function removeCatalogSubscriber(res: Response) {
    catalogSubscribers.delete(res);
}

export function addSubscriber(courseUuid: string, res: Response) {
    const set = subscribers.get(courseUuid) ?? new Set<Response>();
    set.add(res);
    subscribers.set(courseUuid, set);
}

export function removeSubscriber(courseUuid: string, res: Response) {
    const set = subscribers.get(courseUuid);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) {
        subscribers.delete(courseUuid);
    }
}

export function notify(courseUuid: string, event: CourseStateEvent) {
    const set = subscribers.get(courseUuid);
    if (set && set.size > 0) {
        const payload = `data: ${JSON.stringify(event)}\n\n`;
        set.forEach((res) => {
            try {
                res.write(payload);
            } catch {
                // ignore write errors; cleanup happens on close
            }
        });
    }

    // When course state changes (live/paused/archived), notify catalog so students can refresh
    if (event.type === "course-state-changed" && catalogSubscribers.size > 0) {
        const payload = `data: ${JSON.stringify({ type: "course-state-changed", state: event.state, courseUuid } satisfies CatalogEvent)}\n\n`;
        catalogSubscribers.forEach((res) => {
            try {
                res.write(payload);
            } catch {
                // ignore
            }
        });
    }
}