import pool from "../db/index.js";

export type CourseEventType = "material_download" | "link_click" | "course_open";

export async function recordEvent(
    courseUuid: string,
    eventType: CourseEventType,
    options: { userId?: number | null; materialUuid?: string | null } = {}
) {
    await pool.execute(
        `INSERT INTO course_events (course_uuid, user_id, material_uuid, event_type) VALUES (?, ?, ?, ?)`,
        [courseUuid, options.userId ?? null, options.materialUuid ?? null, eventType]
    );
}

type MaterialStats = {
    materialUuid: string;
    downloads: number;
    linkClicks: number;
};

type QuizCompletionForUser = {
    userId: number | null;
    participantName: string;
    completedQuizzes: number;
    totalQuizzes: number;
    completionPercent: number;
};

export async function getCourseStats(courseUuid: string) {
    // Aggregate global course event counts (kept for backwards compatibility)
    const [eventRows] = await pool.execute<
        Array<{ event_type: string; count: number }>
    >(
        `SELECT event_type, COUNT(*) AS count 
         FROM course_events 
         WHERE course_uuid = ? 
         GROUP BY event_type`,
        [courseUuid]
    );

    const stats: {
        materialDownloads: number;
        linkClicks: number;
        courseOpens: number;
        materialStats: Record<string, MaterialStats>;
        quizCompletionByUser: QuizCompletionForUser[];
    } = {
        materialDownloads: 0,
        linkClicks: 0,
        courseOpens: 0,
        materialStats: {},
        quizCompletionByUser: [],
    };

    for (const row of eventRows as any[]) {
        if (row.event_type === "material_download") stats.materialDownloads = row.count;
        if (row.event_type === "link_click") stats.linkClicks = row.count;
        if (row.event_type === "course_open") stats.courseOpens = row.count;
    }

    // Per‑material statistics (downloads / link clicks)
    const [materialRows] = await pool.execute<
        Array<{ material_uuid: string; event_type: string; count: number }>
    >(
        `
        SELECT material_uuid, event_type, COUNT(*) AS count
        FROM course_events
        WHERE course_uuid = ? AND material_uuid IS NOT NULL
        GROUP BY material_uuid, event_type
        `,
        [courseUuid]
    );

    for (const row of materialRows as any[]) {
        const key = row.material_uuid;
        if (!key) continue;
        if (!stats.materialStats[key]) {
            stats.materialStats[key] = {
                materialUuid: key,
                downloads: 0,
                linkClicks: 0,
            };
        }
        if (row.event_type === "material_download") {
            stats.materialStats[key].downloads = row.count;
        } else if (row.event_type === "link_click") {
            stats.materialStats[key].linkClicks = row.count;
        }
    }

    // Quiz completion per user (how many course quizzes they have completed at least once)
    const [quizCountRows] = await pool.execute<Array<{ total_quizzes: number }>>(
        `
        SELECT COUNT(*) AS total_quizzes
        FROM quizzes
        WHERE course_uuid = ?
        `,
        [courseUuid]
    );
    const totalQuizzes = (quizCountRows as any[])[0]?.total_quizzes ?? 0;

    if (totalQuizzes > 0) {
        const [completionRows] = await pool.execute<
            Array<{ user_id: number | null; username: string | null; completed_quizzes: number }>
        >(
            `
            SELECT qa.user_id,
                   u.username,
                   COUNT(DISTINCT qa.quiz_uuid) AS completed_quizzes
            FROM quiz_attempts qa
            JOIN quizzes q ON q.uuid = qa.quiz_uuid AND q.course_uuid = ?
            LEFT JOIN users u ON u.id = qa.user_id
            WHERE qa.user_id IS NOT NULL
            GROUP BY qa.user_id, u.username
            ORDER BY completed_quizzes DESC
            `,
            [courseUuid]
        );

        stats.quizCompletionByUser = (completionRows as any[]).map((row) => {
            const completed = row.completed_quizzes ?? 0;
            const percent =
                totalQuizzes > 0 ? Math.round((completed / totalQuizzes) * 100) : 0;
            return {
                userId: row.user_id ?? null,
                participantName: row.username || `Uživatel ${row.user_id ?? ""}`.trim(),
                completedQuizzes: completed,
                totalQuizzes,
                completionPercent: percent,
            };
        });
    }

    return stats;
}
