import pool from "../db/index.js";
import crypto from "crypto";
import type { Response } from "express";

type FeedType = "manual" | "system";

type FeedItem = {
    uuid: string;
    courseUuid: string;
    moduleUuid?: string | null;
    type: FeedType;
    message: string;
    edited: boolean;
    createdAt: string;
    updatedAt: string;
};

const subscribers = new Map<string, Set<Response>>();

function mapFeedRow(row: any): FeedItem {
    return {
        uuid: row.uuid,
        courseUuid: row.course_uuid,
        moduleUuid: row.module_uuid ?? null,
        type: row.type,
        message: row.message,
        edited: !!row.edited,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    };
}

function notify(courseUuid: string, item: FeedItem) {
    const subs = subscribers.get(courseUuid);
    if (!subs || subs.size === 0) return;

    const payload = `data: ${JSON.stringify(item)}\n\n`;
    subs.forEach((res) => {
        try {
            res.write(payload);
        } catch {
            // ignore broken pipe; cleanup happens on 'close'
        }
    });
}

export async function listForCourse(courseUuid: string) {
    const [rows]: any[] = await pool.execute(
        `
        SELECT uuid, course_uuid, module_uuid, type, message, edited, created_at, updated_at
        FROM feed_items
        WHERE course_uuid = ? AND type = 'manual'
        ORDER BY created_at DESC
        `,
        [courseUuid]
    );
    return rows.map(mapFeedRow);
}

export async function createManualPost(courseUuid: string, message: string, moduleUuid?: string | null) {
    const uuid = crypto.randomUUID();
    await pool.execute(
        "INSERT INTO feed_items (uuid, course_uuid, type, message, edited, module_uuid) VALUES (?, ?, 'manual', ?, 0, ?)",
        [uuid, courseUuid, message, moduleUuid ?? null]
    );
    const item = (await getOne(uuid))!;
    notify(courseUuid, item);
    return item;
}

export async function createSystemEvent(courseUuid: string, message: string) {
    const uuid = crypto.randomUUID();
    await pool.execute(
        "INSERT INTO feed_items (uuid, course_uuid, type, message, edited) VALUES (?, ?, 'system', ?, 0)",
        [uuid, courseUuid, message]
    );
    const item = (await getOne(uuid))!;
    notify(courseUuid, item);
    return item;
}

export async function updatePost(courseUuid: string, postId: string, message: string) {
    await pool.execute(
        "UPDATE feed_items SET message = ?, edited = 1, updated_at = CURRENT_TIMESTAMP WHERE uuid = ? AND course_uuid = ?",
        [message, postId, courseUuid]
    );
    const item = await getOne(postId);
    if (item) {
        notify(courseUuid, item);
    }
    return item;
}

export async function removePost(courseUuid: string, postId: string) {
    const [result]: any = await pool.execute(
        "DELETE FROM feed_items WHERE uuid = ? AND course_uuid = ?",
        [postId, courseUuid]
    );
    return result.affectedRows > 0;
}

export async function getOne(uuid: string) {
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, course_uuid, module_uuid, type, message, edited, created_at, updated_at FROM feed_items WHERE uuid = ?",
        [uuid]
    );
    const row = rows[0];
    return row ? mapFeedRow(row) : null;
}

export async function setModule(courseUuid: string, postId: string, moduleUuid: string | null) {
    await pool.execute(
        "UPDATE feed_items SET module_uuid = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ? AND course_uuid = ?",
        [moduleUuid, postId, courseUuid]
    );
    const item = await getOne(postId);
    if (item) {
        notify(courseUuid, item);
    }
    return item;
}

export function addSubscriber(courseUuid: string, res: Response) {
    const set = subscribers.get(courseUuid) || new Set<Response>();
    set.add(res);
    subscribers.set(courseUuid, set);
}

export function removeSubscriber(courseUuid: string, res: Response) {
    const set = subscribers.get(courseUuid);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) subscribers.delete(courseUuid);
}