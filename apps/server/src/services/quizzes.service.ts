import pool from "../db/index.js";
import crypto from "crypto";
import * as feedService from "./feed.service.js";
import * as modulesService from "./modules.service.js";
import * as mysql from "mysql2/promise";

/* =======================
   TABLE ENSURE
======================= */

let quizzesReady = false;
let quizzesEnsurePromise: Promise<void> | null = null;

async function ensureQuizTables() {
    if (quizzesReady) return;
    if (quizzesEnsurePromise) return quizzesEnsurePromise;

    quizzesEnsurePromise = (async () => {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS quizzes (
                                                   uuid CHAR(36) PRIMARY KEY,
                course_uuid CHAR(36) NOT NULL,
                module_uuid CHAR(36) NULL,
                title VARCHAR(255) NOT NULL,
                count_only_last_answer TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS quiz_questions (
                                                          uuid CHAR(36) PRIMARY KEY,
                quiz_uuid CHAR(36) NOT NULL,
                type ENUM('singleChoice','multipleChoice') NOT NULL,
                question TEXT NOT NULL,
                options_json JSON NOT NULL,
                correct_index INT NULL,
                correct_indices_json JSON NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_uuid) REFERENCES quizzes(uuid) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                                                         uuid CHAR(36) PRIMARY KEY,
                quiz_uuid CHAR(36) NOT NULL,
                user_id INT NULL,
                score INT NOT NULL,
                max_score INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_uuid) REFERENCES quizzes(uuid) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
                                                                attempt_uuid CHAR(36) NOT NULL,
                question_uuid CHAR(36) NOT NULL,
                selected_index INT NULL,
                selected_indices_json JSON NULL,
                correct TINYINT(1) DEFAULT 0,
                comment TEXT NULL,
                PRIMARY KEY (attempt_uuid, question_uuid),
                FOREIGN KEY (attempt_uuid) REFERENCES quiz_attempts(uuid) ON DELETE CASCADE,
                FOREIGN KEY (question_uuid) REFERENCES quiz_questions(uuid) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // In case the tables already exist without newer columns (older deployments),
        // try to add the columns & FK constraints gracefully and ignore failures.
        try {
            await pool.execute(`
                ALTER TABLE quiz_attempts
                ADD COLUMN user_id INT NULL,
                ADD CONSTRAINT fk_quiz_attempts_user
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            `);
        } catch {
            // ignore if column or constraint already exists
        }

        try {
            await pool.execute(`
                ALTER TABLE quizzes
                ADD COLUMN module_uuid CHAR(36) NULL,
                ADD CONSTRAINT fk_quizzes_module
                    FOREIGN KEY (module_uuid) REFERENCES course_modules(uuid) ON DELETE SET NULL
            `);
        } catch {
            // ignore
        }

        try {
            await pool.execute(`
                ALTER TABLE quizzes
                ADD COLUMN count_only_last_answer TINYINT(1) NOT NULL DEFAULT 0
            `);
        } catch {
            // ignore if column already exists
        }

        quizzesReady = true;
    })();

    return quizzesEnsurePromise;
}

/* =======================
   TYPES - Extend RowDataPacket
======================= */

interface QuizRow extends mysql.RowDataPacket {
    uuid: string;
    title: string;
    countOnlyLastAnswer: number;
    createdAt: string;
    attemptsCount: number;
}

interface QuizWithCourseRow extends QuizRow {
    courseUuid: string;
}

interface QuizQuestionRow extends mysql.RowDataPacket {
    uuid: string;
    quiz_uuid: string;
    type: "singleChoice" | "multipleChoice";
    question: string;
    options_json: any; // JSON column can come back as string, array, or Buffer
    correct_index: number | null;
    correct_indices_json: any; // same
}

type QuestionInput = {
    uuid?: string;
    type: "singleChoice" | "multipleChoice";
    question: string;
    options: string[];
    correctIndex?: number;
    correctIndices?: number[];
};

type QuizQuestion = {
    uuid: string;
    type: "singleChoice" | "multipleChoice";
    question: string;
    options: string[];
    correctIndex?: number;
    correctIndices?: number[];
};

type QuizAnswerInput = {
    uuid: string;
    selectedIndex?: number;
    selectedIndices?: number[];
    comment?: string;
};

/* =======================
   HELPERS
======================= */

function normalizeJsonValue(value: any): any {
    // mysql2 JSON may return: string, Buffer, array/object already parsed
    if (value == null) return value;
    if (Buffer.isBuffer(value)) {
        try {
            return JSON.parse(value.toString("utf8"));
        } catch {
            return value.toString("utf8");
        }
    }
    return value;
}

function parseOptions(raw: any): string[] {
    const value = normalizeJsonValue(raw);
    if (Array.isArray(value)) {
        return value.map((v) => String(v));
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map((v) => String(v));
        } catch {
            // fallthrough
        }
        return value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
}

function parseIndices(raw: any): number[] | undefined {
    const value = normalizeJsonValue(raw);
    if (value == null) return undefined;
    if (Array.isArray(value)) {
        const nums = value.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
        return nums.length ? nums : undefined;
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                const nums = parsed.map((n) => Number(n)).filter((n) => !Number.isNaN(n));
                return nums.length ? nums : undefined;
            }
        } catch {
            // fallthrough to comma parsing
        }
        const nums = value
            .split(",")
            .map((s) => Number(s.trim()))
            .filter((n) => !Number.isNaN(n));
        return nums.length ? nums : undefined;
    }
    return undefined;
}

function mapQuestionRow(row: QuizQuestionRow): QuizQuestion {
    return {
        uuid: row.uuid,
        type: row.type,
        question: row.question,
        options: parseOptions(row.options_json),
        correctIndex: row.correct_index ?? undefined,
        correctIndices: parseIndices(row.correct_indices_json),
    };
}

async function fetchQuestionsForQuiz(quizUuid: string): Promise<QuizQuestion[]> {
    await ensureQuizTables();

    const [rows] = await pool.execute<QuizQuestionRow[]>(
        `
        SELECT uuid, quiz_uuid, type, question, options_json, correct_index, correct_indices_json
        FROM quiz_questions
        WHERE quiz_uuid = ?
        ORDER BY created_at ASC
        `,
        [quizUuid]
    ) as [QuizQuestionRow[], mysql.FieldPacket[]];

    return rows.map(mapQuestionRow);
}

/* =======================
   LIST
======================= */

export async function listForCourse(courseUuid: string, userId?: number) {
    await ensureQuizTables();

    // Build query with optional user submission check using EXISTS subquery to avoid duplicates
    const userSubmissionCheck = userId 
        ? `, CASE WHEN EXISTS (SELECT 1 FROM quiz_attempts ua WHERE ua.quiz_uuid = q.uuid AND ua.user_id = ?) THEN 1 ELSE 0 END AS has_submitted`
        : `, 0 AS has_submitted`;
    
    const params = userId ? [courseUuid, userId] : [courseUuid];
    
    const [rows] = await pool.execute<(QuizRow & { module_uuid: string | null; count_only_last_answer: number; has_submitted: number; participants_count: number })[]>(
        `
            SELECT q.uuid, q.title, q.module_uuid, q.count_only_last_answer, q.created_at AS createdAt, 
                   COALESCE(a.count, 0) AS attemptsCount,
                   COALESCE(p.participants_count, 0) AS participants_count
                   ${userSubmissionCheck}
            FROM quizzes q
                     LEFT JOIN (
                SELECT quiz_uuid, COUNT(*) AS count FROM quiz_attempts GROUP BY quiz_uuid
            ) a ON a.quiz_uuid = q.uuid
                     LEFT JOIN (
                SELECT quiz_uuid, 
                       COUNT(DISTINCT CASE WHEN user_id IS NOT NULL THEN CAST(user_id AS CHAR) ELSE uuid END) AS participants_count
                FROM quiz_attempts
                GROUP BY quiz_uuid
            ) p ON p.quiz_uuid = q.uuid
            WHERE q.course_uuid = ?
            ORDER BY q.created_at DESC
        `,
        params
    ) as [QuizRow[], mysql.FieldPacket[]];

    if (!rows.length) return [];

    const quizUuids = rows.map((r) => r.uuid);

    const [questionRows] = await pool.query<QuizQuestionRow[]>(
        `
            SELECT uuid, quiz_uuid, type, question, options_json, correct_index, correct_indices_json
            FROM quiz_questions
            WHERE quiz_uuid IN (?)
            ORDER BY created_at ASC
        `,
        [quizUuids]
    ) as [QuizQuestionRow[], mysql.FieldPacket[]];

    const questionsByQuiz = new Map<string, QuizQuestion[]>();

    questionRows.forEach((r) => {
        const list = questionsByQuiz.get(r.quiz_uuid) ?? [];
        list.push(mapQuestionRow(r));
        questionsByQuiz.set(r.quiz_uuid, list);
    });

    return rows.map((r) => ({
        uuid: r.uuid,
        title: r.title,
        moduleUuid: (r as any).module_uuid ?? null,
        countOnlyLastAnswer: !!(r as any).count_only_last_answer,
        createdAt: r.createdAt,
        attemptsCount: r.attemptsCount,
        participantsCount: (r as any).participants_count ?? 0,
        hasSubmitted: !!(r as any).has_submitted,
        questions: questionsByQuiz.get(r.uuid) ?? [],
    }));
}

/* =======================
   GET ONE
======================= */

export async function getOne(quizUuid: string) {
    await ensureQuizTables();

    const [rows] = await pool.execute<(QuizWithCourseRow & { count_only_last_answer: number })[]>(
        `
            SELECT q.uuid, q.course_uuid AS courseUuid, q.title, q.module_uuid AS moduleUuid,
                   q.count_only_last_answer, q.created_at AS createdAt, COALESCE(a.count, 0) AS attemptsCount
            FROM quizzes q
                     LEFT JOIN (
                SELECT quiz_uuid, COUNT(*) AS count FROM quiz_attempts GROUP BY quiz_uuid
            ) a ON a.quiz_uuid = q.uuid
            WHERE q.uuid = ?
        `,
        [quizUuid]
    ) as [QuizWithCourseRow[], mysql.FieldPacket[]];

    const quiz = rows[0];
    if (!quiz) return null;

    const questions = await fetchQuestionsForQuiz(quizUuid);

    return {
        uuid: quiz.uuid,
        courseUuid: quiz.courseUuid,
        moduleUuid: (quiz as any).moduleUuid ?? null,
        title: quiz.title,
        countOnlyLastAnswer: !!(quiz as any).count_only_last_answer,
        createdAt: quiz.createdAt,
        attemptsCount: quiz.attemptsCount,
        questions,
    };
}

/* =======================
   CREATE / UPDATE
======================= */

export async function create(
    courseUuid: string,
    data: { title: string; questions: QuestionInput[]; moduleUuid?: string | null; countOnlyLastAnswer?: boolean }
) {
    await ensureQuizTables();

    const quizUuid = crypto.randomUUID();
    const finalModuleUuid = data.moduleUuid ?? null;

    await pool.execute<mysql.ResultSetHeader>(
        "INSERT INTO quizzes (uuid, course_uuid, module_uuid, title, count_only_last_answer) VALUES (?, ?, ?, ?, ?)",
        [quizUuid, courseUuid, finalModuleUuid, data.title, data.countOnlyLastAnswer ? 1 : 0]
    );

    await replaceQuestions(quizUuid, data.questions);

    // Only create system event if quiz is not in "Nezařazené" group
    if (finalModuleUuid) {
        const [moduleRows] = await pool.execute<Array<{ title: string }>>(
            "SELECT title FROM course_modules WHERE uuid = ?",
            [finalModuleUuid]
        );
        const moduleTitle = moduleRows[0]?.title;
        if (moduleTitle !== 'Nezařazené') {
            await feedService.createSystemEvent(
                courseUuid,
                `New quiz added: ${data.title}`
            );
        }
    }

    return getOne(quizUuid);
}

export async function update(
    quizUuid: string,
    data: { title: string; questions: QuestionInput[]; moduleUuid?: string | null; countOnlyLastAnswer?: boolean }
) {
    await ensureQuizTables();

    const existing = await getOne(quizUuid);
    if (!existing) return null;

    const existingQuestions = existing.questions || [];
    const hasTypeSwitch = existingQuestions.some((eq: QuizQuestion, i: number) => {
        const incoming = data.questions[i];
        if (!incoming) return false;
        return (
            (eq.type === "singleChoice" && incoming.type === "multipleChoice") ||
            (eq.type === "multipleChoice" && incoming.type === "singleChoice")
        );
    });
    if (hasTypeSwitch) {
        await pool.execute<mysql.ResultSetHeader>("DELETE FROM quiz_attempts WHERE quiz_uuid = ?", [quizUuid]);
    }

    let finalModuleUuid = data.moduleUuid ?? null;
    if (!finalModuleUuid) {
        const ungroupedGroup = await modulesService.getOrCreateUngroupedGroup(existing.courseUuid);
        finalModuleUuid = ungroupedGroup.uuid;
    }

    await pool.execute<mysql.ResultSetHeader>(
        "UPDATE quizzes SET title = ?, module_uuid = ?, count_only_last_answer = ? WHERE uuid = ?",
        [data.title, finalModuleUuid, data.countOnlyLastAnswer ? 1 : 0, quizUuid]
    );

    await replaceQuestions(quizUuid, data.questions);

    return getOne(quizUuid);
}

async function replaceQuestions(
    quizUuid: string,
    questions: QuestionInput[]
) {
    await ensureQuizTables();

    await pool.execute<mysql.ResultSetHeader>(
        "DELETE FROM quiz_questions WHERE quiz_uuid = ?",
        [quizUuid]
    );

    if (!questions.length) return;

    const values = questions.map((q: QuestionInput) => [
        crypto.randomUUID(), // always generate new to avoid PK collisions
        quizUuid,
        q.type,
        q.question,
        JSON.stringify(q.options),
        q.type === "singleChoice" ? q.correctIndex ?? null : null,
        q.type === "multipleChoice"
            ? JSON.stringify(q.correctIndices ?? [])
            : null,
    ]);

    const placeholders = values.map(() => "(?, ?, ?, ?, ?, ?, ?)").join(", ");

    await pool.execute<mysql.ResultSetHeader>(
        `
            INSERT INTO quiz_questions
            (uuid, quiz_uuid, type, question, options_json, correct_index, correct_indices_json)
            VALUES ${placeholders}
        `,
        values.flat()
    );
}

/* =======================
   REMOVE
======================= */

export async function remove(quizUuid: string) {
    await ensureQuizTables();

    const [result] = await pool.execute<mysql.ResultSetHeader>(
        "DELETE FROM quizzes WHERE uuid = ?",
        [quizUuid]
    );

    return result.affectedRows > 0;
}

export async function setModule(quizUuid: string, moduleUuid: string | null) {
    await ensureQuizTables();
    await pool.execute<mysql.ResultSetHeader>(
        "UPDATE quizzes SET module_uuid = ? WHERE uuid = ?",
        [moduleUuid, quizUuid]
    );
    return getOne(quizUuid);
}

/* =======================
   SUBMIT
======================= */

export async function submit(
    quizUuid: string,
    answers: QuizAnswerInput[],
    userId?: number
) {
    await ensureQuizTables();

    const quiz = await getOne(quizUuid);
    if (!quiz) return null;

    // If countOnlyLastAnswer is enabled, check if user already submitted
    if (quiz.countOnlyLastAnswer && userId) {
        const [existingAttempts] = await pool.execute<Array<{ uuid: string }>>(
            "SELECT uuid FROM quiz_attempts WHERE quiz_uuid = ? AND user_id = ?",
            [quizUuid, userId]
        );
        if (existingAttempts.length > 0) {
            throw new Error("Tento kvíz lze vyplnit pouze jednou.");
        }
    }

    // Note: We keep all attempts in the database for history
    // Statistics will filter to only the last attempt per user when countOnlyLastAnswer is true
    // This allows viewing all attempts in participant answers while maintaining correct statistics

    const answersByQ = new Map<string, QuizAnswerInput>(
        answers.map((a) => [a.uuid, a])
    );

    let score = 0;
    const correctPerQuestion: boolean[] = [];

    quiz.questions.forEach((q) => {
        const ans = answersByQ.get(q.uuid);
        let correct = false;

        if (q.type === "singleChoice") {
            correct = ans?.selectedIndex === q.correctIndex;
        } else {
            const expected = [...(q.correctIndices ?? [])].sort((a, b) => a - b);
            const got = [...(ans?.selectedIndices ?? [])].sort((a, b) => a - b);

            correct =
                expected.length === got.length &&
                expected.every((v, i) => v === got[i]);
        }

        if (correct) score++;
        correctPerQuestion.push(correct);
    });

    const attemptUuid = crypto.randomUUID();
    const submittedAt = new Date();

    await pool.execute<mysql.ResultSetHeader>(
        `
            INSERT INTO quiz_attempts
                (uuid, quiz_uuid, user_id, score, max_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `,
        [attemptUuid, quizUuid, userId ?? null, score, quiz.questions.length, submittedAt]
    );

    if (quiz.questions.length) {
        const answerRows = quiz.questions.map((q, i) => {
            const ans = answersByQ.get(q.uuid);
            return [
                attemptUuid,
                q.uuid,
                ans?.selectedIndex ?? null,
                ans?.selectedIndices
                    ? JSON.stringify(ans.selectedIndices)
                    : null,
                correctPerQuestion[i] ? 1 : 0,
                ans?.comment ?? null,
            ];
        });

        const placeholders = answerRows.map(() => "(?, ?, ?, ?, ?, ?)").join(", ");

        await pool.execute<mysql.ResultSetHeader>(
            `
                INSERT INTO quiz_attempt_answers
                (attempt_uuid, question_uuid, selected_index, selected_indices_json, correct, comment)
                VALUES ${placeholders}
            `,
            answerRows.flat()
        );
    }

    return {
        quizUuid,
        score,
        maxScore: quiz.questions.length,
        correctPerQuestion,
        submittedAt: submittedAt.toISOString(),
    };
}

/* =======================
   STATS (per-question correct %)
======================= */

export async function getStats(quizUuid: string) {
    await ensureQuizTables();

    const quiz = await getOne(quizUuid);
    if (!quiz) return null;

    // If countOnlyLastAnswer is true, we need to filter to only the last attempt per user
    let latestAttemptUuids: string[] = [];
    
    if (quiz.countOnlyLastAnswer) {
        // Get only the most recent attempt per user
        const [latestRows] = await pool.execute<Array<{ uuid: string }>>(
            `
            SELECT a1.uuid
            FROM quiz_attempts a1
            WHERE a1.quiz_uuid = ?
            AND (
                a1.user_id IS NULL OR
                a1.created_at = (
                    SELECT MAX(a2.created_at)
                    FROM quiz_attempts a2
                    WHERE a2.quiz_uuid = a1.quiz_uuid
                    AND a2.user_id = a1.user_id
                )
            )
            `,
            [quizUuid]
        );
        latestAttemptUuids = latestRows.map(r => r.uuid);
    }

    const attemptFilter = quiz.countOnlyLastAnswer && latestAttemptUuids.length > 0
        ? "AND a.uuid IN (" + latestAttemptUuids.map(() => "?").join(",") + ")"
        : "";

    const [rows] = (await pool.execute(
        `
        SELECT qa.question_uuid AS questionUuid,
               COUNT(*) AS total,
               SUM(qa.correct) AS correct
        FROM quiz_attempt_answers qa
        JOIN quiz_attempts a ON a.uuid = qa.attempt_uuid
        WHERE a.quiz_uuid = ? ${attemptFilter}
        GROUP BY qa.question_uuid
        `,
        quiz.countOnlyLastAnswer && latestAttemptUuids.length > 0
            ? [quizUuid, ...latestAttemptUuids]
            : [quizUuid]
    )) as [Array<{ questionUuid: string; total: number; correct: number }>, unknown[]];

    const statsByQ = new Map(
        rows.map((r) => [r.questionUuid, { total: r.total, correct: r.correct }])
    );

    // Load all raw answers to compute per-option distribution (including multi-select)
    const answerAttemptFilter = quiz.countOnlyLastAnswer && latestAttemptUuids.length > 0
        ? "AND a.uuid IN (" + latestAttemptUuids.map(() => "?").join(",") + ")"
        : "";
    const [answerRows] = (await pool.execute(
        `
        SELECT qa.question_uuid        AS questionUuid,
               qa.selected_index       AS selectedIndex,
               qa.selected_indices_json AS selectedIndicesJson
        FROM quiz_attempt_answers qa
                 JOIN quiz_attempts a ON a.uuid = qa.attempt_uuid
        WHERE a.quiz_uuid = ? ${answerAttemptFilter}
        `,
        quiz.countOnlyLastAnswer && latestAttemptUuids.length > 0
            ? [quizUuid, ...latestAttemptUuids]
            : [quizUuid]
    )) as [Array<{ questionUuid: string; selectedIndex: number | null; selectedIndicesJson: any }>, unknown[]];

    const distributionByQ = new Map<
        string,
        { counts: number[]; totalSelections: number }
    >();

    // Helper to ensure we have a distribution bucket for a question
    function ensureDistributionForQuestion(
        questionUuid: string,
        optionCount: number
    ) {
        let entry = distributionByQ.get(questionUuid);
        if (!entry) {
            entry = {
                counts: Array(optionCount).fill(0),
                totalSelections: 0,
            };
            distributionByQ.set(questionUuid, entry);
        } else if (entry.counts.length < optionCount) {
            // Expand if questions were edited and now have more options
            const diff = optionCount - entry.counts.length;
            entry.counts.push(...Array(diff).fill(0));
        }
        return entry;
    }

    // Pre-map questions by UUID for quick lookup
    const questionsByUuid = new Map(quiz.questions.map((q) => [q.uuid, q]));

    for (const row of answerRows) {
        const question = questionsByUuid.get(row.questionUuid);
        if (!question) continue;

        const optionCount = question.options.length;
        if (!optionCount) continue;

        const entry = ensureDistributionForQuestion(row.questionUuid, optionCount);

        if (question.type === "singleChoice") {
            if (
                typeof row.selectedIndex === "number" &&
                row.selectedIndex >= 0 &&
                row.selectedIndex < optionCount
            ) {
                entry.counts[row.selectedIndex] += 1;
                entry.totalSelections += 1;
            }
        } else {
            const indices = parseIndices(row.selectedIndicesJson) ?? [];
            for (const idx of indices) {
                if (idx >= 0 && idx < optionCount) {
                    entry.counts[idx] += 1;
                    entry.totalSelections += 1;
                }
            }
        }
    }

    const questionStats = quiz.questions.map((q) => {
        const s = statsByQ.get(q.uuid);
        const total = s?.total ?? 0;
        const correct = s?.correct ?? 0;
        const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

        const dist = distributionByQ.get(q.uuid);
        const totalSelections = dist?.totalSelections ?? 0;
        const optionDistribution =
            dist && dist.counts.length
                ? dist.counts.map((count, idx) => ({
                      option: q.options[idx],
                      count,
                      percent:
                          totalSelections > 0
                              ? Math.round((count / totalSelections) * 100)
                              : 0,
                  }))
                : q.options.map((opt) => ({
                      option: opt,
                      count: 0,
                      percent: 0,
                  }));

        return {
            questionUuid: q.uuid,
            question: q.question,
            totalAttempts: total,
            correctCount: correct,
            percentCorrect: percent,
            optionDistribution,
        };
    });

    // Participants – list each attempt's participant, with usernames or anonymous labels
    const participantAttemptFilter = quiz.countOnlyLastAnswer && latestAttemptUuids.length > 0
        ? "AND a.uuid IN (" + latestAttemptUuids.map(() => "?").join(",") + ")"
        : "";
    const [participantRows] = (await pool.execute(
        `
        SELECT a.uuid      AS attemptUuid,
               a.user_id   AS userId,
               u.username  AS username
        FROM quiz_attempts a
                 LEFT JOIN users u ON u.id = a.user_id
        WHERE a.quiz_uuid = ? ${participantAttemptFilter}
        ORDER BY a.created_at ASC
        `,
        quiz.countOnlyLastAnswer && latestAttemptUuids.length > 0
            ? [quizUuid, ...latestAttemptUuids]
            : [quizUuid]
    )) as [Array<{ attemptUuid: string; userId: number | null; username: string | null }>, unknown[]];

    const participantNames: string[] = [];
    let anonymousCounter = 0;

    for (const row of participantRows) {
        if (row.userId && row.username) {
            participantNames.push(row.username);
        } else {
            anonymousCounter += 1;
            participantNames.push(`anonymous_${anonymousCounter}`);
        }
    }

    const [totalAttemptsRow] = await pool.execute<Array<{ total: number }>>(
        "SELECT COUNT(*) AS total FROM quiz_attempts WHERE quiz_uuid = ?",
        [quizUuid]
    );
    const totalAttempts = (totalAttemptsRow as any[])[0]?.total ?? 0;

    return {
        quizUuid,
        title: quiz.title,
        totalAttempts,
        participantsCount: participantNames.length,
        questionStats,
        participants: {
            total: participantNames.length,
            names: participantNames,
        },
    };
}

export async function getParticipantAnswers(quizUuid: string) {
    await ensureQuizTables();

    const quiz = await getOne(quizUuid);
    if (!quiz) return null;

    const [attemptRows] = await pool.execute<Array<{
        attemptUuid: string;
        userId: number | null;
        username: string | null;
        score: number;
        maxScore: number;
        createdAt: string;
    }>>(
        `
        SELECT a.uuid AS attemptUuid,
               a.user_id AS userId,
               u.username AS username,
               a.score,
               a.max_score AS maxScore,
               a.created_at AS createdAt
        FROM quiz_attempts a
        LEFT JOIN users u ON u.id = a.user_id
        WHERE a.quiz_uuid = ?
        ORDER BY a.created_at DESC
        `,
        [quizUuid]
    );

    if (attemptRows.length === 0) {
        return [];
    }

    const attemptUuids = attemptRows.map(r => r.attemptUuid);
    const placeholders = attemptUuids.map(() => "?").join(",");
    
    const [answerRows] = await pool.execute<Array<{
        attemptUuid: string;
        questionUuid: string;
        selectedIndex: number | null;
        selectedIndicesJson: any;
        correct: number;
    }>>(
        `
        SELECT attempt_uuid AS attemptUuid,
               question_uuid AS questionUuid,
               selected_index AS selectedIndex,
               selected_indices_json AS selectedIndicesJson,
               correct
        FROM quiz_attempt_answers
        WHERE attempt_uuid IN (${placeholders})
        `,
        attemptUuids
    );

    const answersByAttempt = new Map<string, Array<{
        questionUuid: string;
        selectedIndex: number | null;
        selectedIndices: number[] | null;
        correct: boolean;
    }>>();

    for (const answer of answerRows) {
        const list = answersByAttempt.get(answer.attemptUuid) || [];
        list.push({
            questionUuid: answer.questionUuid,
            selectedIndex: answer.selectedIndex,
            selectedIndices: parseIndices(answer.selectedIndicesJson) ?? null,
            correct: !!answer.correct,
        });
        answersByAttempt.set(answer.attemptUuid, list);
    }

    // Map questions by UUID for easy lookup
    const questionsByUuid = new Map(quiz.questions.map(q => [q.uuid, q]));

    // Group attempts by user to count tries per user
    const attemptsByUser = new Map<string, Array<{
        attemptUuid: string;
        participantName: string;
        score: number;
        maxScore: number;
        createdAt: string;
        answers: Array<{
            questionUuid: string;
            selectedIndex: number | null;
            selectedIndices: number[] | null;
            correct: boolean;
        }>;
    }>>();

    for (const attempt of attemptRows) {
        // Create a unique key for each user (or anonymous user)
        const userKey = attempt.userId 
            ? `user_${attempt.userId}` 
            : `anon_${attempt.attemptUuid}`;
        
        const participantName = attempt.username || `Anonymous ${attempt.userId || 'user'}`;
        
        const attemptData = {
            attemptUuid: attempt.attemptUuid,
            participantName,
            score: attempt.score,
            maxScore: attempt.maxScore,
            createdAt: attempt.createdAt,
            answers: answersByAttempt.get(attempt.attemptUuid) || [],
        };

        const userAttempts = attemptsByUser.get(userKey) || [];
        userAttempts.push(attemptData);
        attemptsByUser.set(userKey, userAttempts);
    }

    // One row per participant; totalAttempts = number of times they attempted
    const participantsList = Array.from(attemptsByUser.values()).map((userAttempts) => {
        const firstAttempt = userAttempts[0];
        return {
            participantName: firstAttempt.participantName,
            totalAttempts: userAttempts.length,
            attempts: userAttempts,
        };
    });

    return {
        questions: quiz.questions.map((q) => ({
            uuid: q.uuid,
            question: q.question,
            options: q.options,
            type: q.type,
        })),
        participants: participantsList,
    };
}