// src/services/courses.service.ts
import pool from "../db/index.js";
import crypto from "crypto";
import * as modulesService from "./modules.service.js";
import * as materialsService from "./materials.service.js";
import * as quizzesService from "./quizzes.service.js";
import * as feedService from "./feed.service.js";

export type CourseState = "draft" | "scheduled" | "live" | "paused" | "archived";

const TZ = "Europe/Prague";

const COURSE_COLS =
    "uuid, name, description, state, live_at AS liveAt, live_at_local AS liveAtLocal, is_published AS isPublished";

function toLocalString(val: string | null | undefined): string | null {
    if (val == null || typeof val !== "string" || !val.trim()) return null;
    const s = val.trim().replace("T", " ");
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return null;
    return s.slice(0, 16);
}

function formatLegacyLiveAt(val: string | Date | null): string | null {
    if (val == null) return null;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T");
}

function mapCourse(r: any) {
    if (!r) return r;
    return { ...r, liveAt: r.liveAtLocal ?? formatLegacyLiveAt(r.liveAt) };
}

export async function getAll() {
    const [rows]: any = await pool.execute(
        `SELECT ${COURSE_COLS} FROM courses`
    );
    return (rows || []).map(mapCourse);
}

/** For student catalog: live, scheduled, and paused courses (scheduled/paused visible but not openable) */
export async function getAllForCatalog() {
    const [rows]: any = await pool.execute(
        `SELECT ${COURSE_COLS} FROM courses WHERE state IN ('live', 'scheduled', 'paused')`
    );
    return (rows || []).map(mapCourse);
}

export async function getOne(uuid: string) {
    const [rows]: any = await pool.execute(
        `SELECT ${COURSE_COLS} FROM courses WHERE uuid = ?`,
        [uuid]
    );
    return mapCourse(rows[0]) ?? null;
}

export async function create(data: { name: string; description?: string }) {
    const uuid = crypto.randomUUID();

    await pool.execute(
        "INSERT INTO courses (uuid, name, description, state) VALUES (?, ?, ?, 'draft')",
        [uuid, data.name, data.description ?? null]
    );

    await modulesService.getOrCreateUngroupedGroup(uuid);

    return getOne(uuid);
}

export async function update(uuid: string, data: { name: string; description?: string }) {
    const [result]: any = await pool.execute(
        "UPDATE courses SET name = ?, description = ? WHERE uuid = ?",
        [data.name, data.description || null, uuid]
    );
    return result.affectedRows > 0 ? getOne(uuid) : null;
}

export async function remove(uuid: string) {
    const [result]: any = await pool.execute(
        "DELETE FROM courses WHERE uuid = ?",
        [uuid]
    );
    return result.affectedRows > 0;
}

export async function setPublishState(uuid: string, isPublished: boolean) {
    const state = isPublished ? "live" : "draft";
    const [result]: any = await pool.execute(
        "UPDATE courses SET state = ?, is_published = ? WHERE uuid = ?",
        [state, isPublished ? 1 : 0, uuid]
    );
    return result.affectedRows > 0 ? getOne(uuid) : null;
}

export async function setState(uuid: string, state: CourseState) {
    const [result]: any = await pool.execute(
        "UPDATE courses SET state = ?, is_published = ? WHERE uuid = ?",
        [state, state === "live" ? 1 : 0, uuid]
    );
    return result.affectedRows > 0 ? getOne(uuid) : null;
}

export async function setLiveAt(uuid: string, liveAt: string | null) {
    const localStr = toLocalString(liveAt);
    const conn = await pool.getConnection();
    try {
        await conn.execute("SET time_zone = ?", [TZ]);
        const [result]: any = await conn.execute(
            "UPDATE courses SET live_at_local = ? WHERE uuid = ?",
            [localStr ?? null, uuid]
        );
        return result.affectedRows > 0 ? getOne(uuid) : null;
    } finally {
        conn.release();
    }
}

export async function duplicate(uuid: string) {
    const course = await getOne(uuid);
    if (!course) return null;

    const newUuid = crypto.randomUUID();

    await pool.execute(
        "INSERT INTO courses (uuid, name, description, state, live_at, is_published) VALUES (?, ?, ?, 'draft', NULL, 0)",
        [newUuid, (course as any).name + " (kopie)", (course as any).description]
    );

    const groups = await modulesService.listForCourse(uuid);
    const groupMap = new Map<string, string>(); // old uuid -> new uuid

    for (const g of groups) {
        const newGroupUuid = crypto.randomUUID();
        groupMap.set(g.uuid, newGroupUuid);
        await pool.execute(
            `INSERT INTO course_modules (uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at, scheduled_unlock_at)
             SELECT ?, ?, title, description, sort_order, 0, NULL, scheduled_unlock_at FROM course_modules WHERE uuid = ?`,
            [newGroupUuid, newUuid, g.uuid]
        );
    }

    const materials = await materialsService.getAllForCourse(uuid);
    for (const m of materials as any[]) {
        const newMaterialUuid = crypto.randomUUID();
        const newModuleUuid = m.moduleUuid ? groupMap.get(m.moduleUuid) ?? null : null;
        await pool.execute(
            `INSERT INTO materials (uuid, course_uuid, module_uuid, type, name, description, url, file_path, file_name, mime_type, file_size)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                newMaterialUuid,
                newUuid,
                newModuleUuid,
                m.type,
                m.name,
                m.description ?? null,
                m.url ?? null,
                m.filePath ?? null,
                m.fileName ?? null,
                m.mimeType ?? null,
                m.size ?? null,
            ]
        );
    }

    const quizzes = await quizzesService.listForCourse(uuid);
    for (const q of quizzes as any[]) {
        const newQuizUuid = crypto.randomUUID();
        const newModuleUuid = q.moduleUuid ? groupMap.get(q.moduleUuid) ?? null : null;
        await pool.execute(
            "INSERT INTO quizzes (uuid, course_uuid, module_uuid, title, count_only_last_answer) VALUES (?, ?, ?, ?, ?)",
            [newQuizUuid, newUuid, newModuleUuid, q.title, q.countOnlyLastAnswer ? 1 : 0]
        );
        const questions = (q as any).questions || [];
        for (const qu of questions) {
            const newQuestionUuid = crypto.randomUUID();
            const [optRows]: any = await pool.execute(
                "SELECT options_json, correct_index, correct_indices_json FROM quiz_questions WHERE uuid = ?",
                [qu.uuid]
            );
            const row = optRows[0];
            if (!row) continue;
            await pool.execute(
                `INSERT INTO quiz_questions (uuid, quiz_uuid, type, question, options_json, correct_index, correct_indices_json)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    newQuestionUuid,
                    newQuizUuid,
                    qu.type,
                    qu.question,
                    typeof row.options_json === "string" ? row.options_json : JSON.stringify(row.options_json),
                    row.correct_index ?? null,
                    row.correct_indices_json != null
                        ? (typeof row.correct_indices_json === "string"
                            ? row.correct_indices_json
                            : JSON.stringify(row.correct_indices_json))
                        : null,
                ]
            );
        }
    }

    const feedItems = await feedService.listForCourse(uuid);
    for (const f of feedItems as any[]) {
        const newFeedUuid = crypto.randomUUID();
        const newModuleUuid = f.moduleUuid ? groupMap.get(f.moduleUuid) ?? null : null;
        await pool.execute(
            `INSERT INTO feed_items (uuid, course_uuid, module_uuid, type, message, edited)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [newFeedUuid, newUuid, newModuleUuid, f.type, f.message, f.edited ? 1 : 0]
        );
    }

    return getOne(newUuid);
}