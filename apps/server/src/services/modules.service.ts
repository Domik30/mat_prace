import pool from "../db/index.js";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";

const TZ = "Europe/Prague";

/** Normalize "2026-02-21T21:00" or "2026-02-21 21:00" to "2026-02-21 21:00" for storage */
function toLocalString(val: string | null | undefined): string | null {
    if (val == null || typeof val !== "string" || !val.trim()) return null;
    const s = val.trim().replace("T", " ");
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s)) return null;
    return s.slice(0, 16);
}

export interface CourseModule extends RowDataPacket {
    uuid: string;
    course_uuid: string;
    title: string;
    description: string | null;
    sort_order: number;
    is_unlocked: number;
    unlocked_at: string | null;
    scheduled_unlock_at: string | null;
    created_at: string;
}

async function ensureModulesTable() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS course_modules (
            uuid CHAR(36) PRIMARY KEY,
            course_uuid CHAR(36) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NULL,
            sort_order INT NOT NULL DEFAULT 0,
            is_unlocked TINYINT(1) NOT NULL DEFAULT 0,
            unlocked_at TIMESTAMP NULL,
            scheduled_unlock_at TIMESTAMP NULL,
            scheduled_unlock_local VARCHAR(20) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    try {
        await pool.execute(`ALTER TABLE course_modules ADD COLUMN scheduled_unlock_local VARCHAR(20) NULL`);
    } catch {
        // column already exists
    }
}

const COLS_BASE = "uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at, scheduled_unlock_at, created_at";

/** Select rows with scheduled_unlock_local if column exists */
async function selectModules(courseUuid: string, whereExtra = ""): Promise<any[]> {
    const baseSelect = `SELECT ${COLS_BASE} FROM course_modules WHERE course_uuid = ? ${whereExtra}`.trim();
    try {
        const [rows] = await pool.execute<any[]>(
            `SELECT ${COLS_BASE}, scheduled_unlock_local FROM course_modules WHERE course_uuid = ? ${whereExtra}`.trim(),
            [courseUuid]
        );
        return Array.isArray(rows) ? rows : [];
    } catch {
        const [rows] = await pool.execute<any[]>(baseSelect, [courseUuid]);
        return Array.isArray(rows) ? rows : [];
    }
}

function mapModule(r: any) {
    return {
        uuid: r.uuid,
        courseUuid: r.course_uuid,
        title: r.title,
        description: r.description,
        sortOrder: r.sort_order,
        isUnlocked: !!r.is_unlocked,
        unlockedAt: r.unlocked_at,
        scheduledUnlockAt: r.scheduled_unlock_local ?? formatLegacy(r.scheduled_unlock_at),
        createdAt: r.created_at,
    };
}

export async function getOrCreateUngroupedGroup(courseUuid: string) {
    await ensureModulesTable();

    const rows = await selectModules(courseUuid, "AND title = 'Nezařazené'");
    
    if (rows.length > 0) {
        return mapModule(rows[0]);
    }

    const uuid = crypto.randomUUID();
    await pool.execute(
        `INSERT INTO course_modules (uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at, scheduled_unlock_at)
         VALUES (?, ?, 'Nezařazené', NULL, 0, 0, NULL, NULL)`,
        [uuid, courseUuid]
    );
    return getOne(uuid);
}

/** Format old TIMESTAMP for backward compatibility */
function formatLegacy(val: string | Date | null): string | null {
    if (val == null) return null;
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString("sv-SE", { timeZone: TZ }).slice(0, 16).replace(" ", "T");
}

export async function listForCourse(courseUuid: string, includeUngrouped: boolean = true) {
    await ensureModulesTable();

    if (includeUngrouped) {
        await getOrCreateUngroupedGroup(courseUuid);
    }

    const rows = await selectModules(courseUuid, "ORDER BY sort_order ASC, created_at ASC");
    return rows.map((r) => mapModule(r));
}

export async function create(courseUuid: string, data: { title: string; description?: string | null }) {
    await ensureModulesTable();

    const [maxRow] = await pool.execute<any[]>(
        "SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM course_modules WHERE course_uuid = ?",
        [courseUuid]
    );
    const nextOrder = (maxRow as any[])[0]?.maxOrder + 1;

    const uuid = crypto.randomUUID();
    // Groups are always locked by default
    await pool.execute(
        `
            INSERT INTO course_modules (uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at, scheduled_unlock_at)
            VALUES (?, ?, ?, ?, ?, 0, NULL, NULL)
        `,
        [uuid, courseUuid, data.title, data.description ?? null, nextOrder]
    );

    return getOne(uuid);
}

export async function getOne(moduleUuid: string) {
    await ensureModulesTable();
    const [rows] = await pool.execute<CourseModule[] & RowDataPacket[]>(
        `
            SELECT uuid,
                   course_uuid,
                   title,
                   description,
                   sort_order,
                   is_unlocked,
                   unlocked_at,
                   scheduled_unlock_at,
                   created_at
            FROM course_modules
            WHERE uuid = ?
        `,
        [moduleUuid]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        uuid: r.uuid,
        courseUuid: r.course_uuid,
        title: r.title,
        description: r.description,
        sortOrder: r.sort_order,
        isUnlocked: !!r.is_unlocked,
        unlockedAt: r.unlocked_at,
        scheduledUnlockAt: (r as any).scheduled_unlock_local ?? formatLegacy((r as any).scheduled_unlock_at),
        createdAt: r.created_at,
    };
}

export async function update(
    moduleUuid: string,
    data: { title?: string; description?: string | null; sortOrder?: number; scheduledUnlockAt?: string | null }
) {
    await ensureModulesTable();
    const existing = await getOne(moduleUuid);
    if (!existing) return null;

    const title = data.title ?? existing.title;
    const description = data.description ?? existing.description;
    const sortOrder = typeof data.sortOrder === "number" ? data.sortOrder : existing.sortOrder;
    const scheduledLocal = data.scheduledUnlockAt !== undefined ? toLocalString(data.scheduledUnlockAt) : (existing as any).scheduledUnlockAt;

    const conn = await pool.getConnection();
    try {
        await conn.execute("SET time_zone = ?", [TZ]);
        await conn.execute(
            `UPDATE course_modules SET title = ?, description = ?, sort_order = ?, scheduled_unlock_local = ? WHERE uuid = ?`,
            [title, description, sortOrder, scheduledLocal ?? null, moduleUuid]
        );
        maybeUnlockIfDue(conn, moduleUuid);
    } finally {
        conn.release();
    }

    return getOne(moduleUuid);
}

export async function remove(moduleUuid: string) {
    await ensureModulesTable();
    
    // Check if this is the "Nezařazené" group - don't allow deletion
    const existing = await getOne(moduleUuid);
    if (existing && existing.title === 'Nezařazené') {
        throw new Error('Cannot delete the "Nezařazené" group');
    }

    // Detach materials, quizzes, and feed items from this module
    await pool.execute("UPDATE materials SET module_uuid = NULL WHERE module_uuid = ?", [moduleUuid]);
    await pool.execute("UPDATE quizzes SET module_uuid = NULL WHERE module_uuid = ?", [moduleUuid]);
    await pool.execute("UPDATE feed_items SET module_uuid = NULL WHERE module_uuid = ?", [moduleUuid]);

    const [result]: any = await pool.execute("DELETE FROM course_modules WHERE uuid = ?", [moduleUuid]);
    return result.affectedRows > 0;
}

export async function setUnlockState(moduleUuid: string, isUnlocked: boolean) {
    await ensureModulesTable();
    const existing = await getOne(moduleUuid);
    if (!existing) return null;

    const unlockedAt =
        isUnlocked && !existing.isUnlocked ? new Date() : existing.unlockedAt ? new Date(existing.unlockedAt) : null;

    // When unlocking manually, clear scheduled timing; when locking, keep it
    const clearScheduled = isUnlocked ? ", scheduled_unlock_local = NULL" : "";
    await pool.execute(
        `UPDATE course_modules SET is_unlocked = ?, unlocked_at = ?${clearScheduled} WHERE uuid = ?`,
        [isUnlocked ? 1 : 0, unlockedAt, moduleUuid]
    );

    return getOne(moduleUuid);
}

/** Unlock group only when scheduled minute has passed (STR_TO_DATE for correct comparison) */
async function maybeUnlockIfDue(conn: import("mysql2/promise").PoolConnection, moduleUuid: string) {
    await conn.execute(
        `UPDATE course_modules SET is_unlocked = 1, unlocked_at = NOW()
         WHERE uuid = ? AND scheduled_unlock_local IS NOT NULL
         AND scheduled_unlock_local REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$'
         AND STR_TO_DATE(scheduled_unlock_local, '%Y-%m-%d %H:%i') <= NOW() AND is_unlocked = 0`,
        [moduleUuid]
    );
}

export async function setScheduledUnlockAt(moduleUuid: string, scheduledUnlockAt: string | null) {
    await ensureModulesTable();
    const existing = await getOne(moduleUuid);
    if (!existing) return null;

    const localStr = toLocalString(scheduledUnlockAt);

    const conn = await pool.getConnection();
    try {
        await conn.execute("SET time_zone = ?", [TZ]);
        await conn.execute(
            "UPDATE course_modules SET scheduled_unlock_local = ? WHERE uuid = ?",
            [localStr ?? null, moduleUuid]
        );
        maybeUnlockIfDue(conn, moduleUuid);
    } finally {
        conn.release();
    }

    return getOne(moduleUuid);
}

export async function reorder(courseUuid: string, orderedUuids: string[]) {
    await ensureModulesTable();
    for (let i = 0; i < orderedUuids.length; i++) {
        await pool.execute(
            "UPDATE course_modules SET sort_order = ? WHERE uuid = ? AND course_uuid = ?",
            [i, orderedUuids[i], courseUuid]
        );
    }
    return listForCourse(courseUuid);
}