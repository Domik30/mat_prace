import pool from "../db/index.js";
import * as courseState from "./courseState.service.js";

const INTERVAL_MS = 10 * 1000; // 10 seconds – release at the minute boundary, not at the end
export function startScheduler() {
    async function tick() {
        try {
            const conn = await pool.getConnection();
            try {
                // Nepokoušíme se nastavovat konkrétní pojmenované časové pásmo,
                // protože některé lokální MySQL instalace nemají nahrané tz databáze.
                // Spoléháme na výchozí timezone serveru (NOW()).
                // Courses: scheduled -> live when live_at_local minute has passed (same approach as groups)
                // Fallback: live_at (legacy) when live_at_local is NULL
                const [courseRows] = await conn.execute<{ uuid: string }[]>(
                    `SELECT uuid FROM courses WHERE state = 'scheduled'
                     AND (
                       (live_at_local IS NOT NULL AND live_at_local REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$'
                        AND STR_TO_DATE(live_at_local, '%Y-%m-%d %H:%i') <= NOW())
                       OR
                       (live_at_local IS NULL AND live_at IS NOT NULL AND live_at <= NOW())
                     )`
                );
                const coursesToLive = Array.isArray(courseRows) ? courseRows : [];
                if (coursesToLive.length > 0) {
                    await conn.execute(
                        `UPDATE courses SET state = 'live', is_published = 1 WHERE state = 'scheduled'
                         AND (
                           (live_at_local IS NOT NULL AND live_at_local REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$'
                            AND STR_TO_DATE(live_at_local, '%Y-%m-%d %H:%i') <= NOW())
                           OR
                           (live_at_local IS NULL AND live_at IS NOT NULL AND live_at <= NOW())
                         )`
                    );
                    for (const c of coursesToLive) {
                        courseState.notify(c.uuid, { type: "course-state-changed", state: "live" });
                    }
                }
                // Groups: unlock only when scheduled minute has passed (STR_TO_DATE ensures correct comparison in Prague)
                const [rows] = await conn.execute<{ uuid: string; course_uuid: string }[]>(
                    `SELECT uuid, course_uuid FROM course_modules
                     WHERE scheduled_unlock_local IS NOT NULL AND scheduled_unlock_local REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$'
                     AND STR_TO_DATE(scheduled_unlock_local, '%Y-%m-%d %H:%i') <= NOW() AND is_unlocked = 0`
                );
                const toUnlock = Array.isArray(rows) ? rows : [];
                if (toUnlock.length > 0) {
                    await conn.execute(
                        `UPDATE course_modules SET is_unlocked = 1, unlocked_at = NOW()
                         WHERE scheduled_unlock_local IS NOT NULL AND scheduled_unlock_local REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$'
                         AND STR_TO_DATE(scheduled_unlock_local, '%Y-%m-%d %H:%i') <= NOW() AND is_unlocked = 0`
                    );
                    const now = new Date().toISOString();
                    for (const r of toUnlock) {
                        courseState.notify(r.course_uuid, {
                            type: "unlock",
                            entityType: "module",
                            uuid: r.uuid,
                            isUnlocked: true,
                            unlockedAt: now,
                        });
                    }
                }
            } finally {
                conn.release();
            }
        } catch (err) {
            console.error("Scheduler tick error:", err);
        }
    }

    tick(); // run once on start
    setInterval(tick, INTERVAL_MS);
    console.log("Scheduler started - checking every", INTERVAL_MS / 1000, "seconds");
}
