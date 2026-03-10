import { createPool } from "mysql2/promise";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
export const pool = createPool({
    host: process.env.DB_HOST || "localhost",
    // Match the Docker dev container started by `npm run db`
    // (see package.json: mysql:8.0 exposed on host port 3307)
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || "root",
    // Default to the same password and db name as `npm run db`
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "app",
    waitForConnections: true,
    connectionLimit: 10,
    // Použijeme časové pásmo serveru MySQL (obvykle Europe/Prague),
    // protože mysql2 nepodporuje názvy jako "Europe/Prague" bez varování.
    timezone: "local",
});

export default pool;

export async function initDatabase() {
    const conn = await pool.getConnection();

    try {
        /* =======================
           COURSES
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS courses (
                uuid CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                is_published TINYINT(1) NOT NULL DEFAULT 1,
                state ENUM('draft','scheduled','live','paused','archived') NOT NULL DEFAULT 'draft',
                live_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Older databases might not have is_published; add it if missing.
        try {
            await conn.execute(`
                ALTER TABLE courses
                ADD COLUMN is_published TINYINT(1) NOT NULL DEFAULT 1
            `);
        } catch {
            // ignore if column already exists
        }

        // Add state and live_at for course lifecycle (draft/scheduled/live/paused/archived)
        try {
            await conn.execute(`
                ALTER TABLE courses
                ADD COLUMN state ENUM('draft','scheduled','live','paused','archived') NOT NULL DEFAULT 'draft',
                ADD COLUMN live_at TIMESTAMP NULL
            `);
            // Migrate: is_published=1 -> live, is_published=0 -> draft
            await conn.execute(`
                UPDATE courses SET state = IF(is_published = 1, 'live', 'draft')
            `);
        } catch {
            // ignore if columns already exist
        }

        const [courseRows] = await conn.execute("SELECT COUNT(*) AS count FROM courses");
        const courseCount = (courseRows as any[])[0]?.count ?? 0;

        // Keep track of UUIDs for newly-seeded courses
        let seededCourseUuids: string[] = [];

        if (courseCount === 0) {
            const uuid1 = randomUUID();
            const uuid2 = randomUUID();

            await conn.execute(
                `
                    INSERT INTO courses (uuid, name, description, state, is_published)
                    VALUES (?, ?, ?, 'draft', 0), (?, ?, ?, 'draft', 0)
                `,
                [
                    uuid1, "Úvod do IT", "Základní kurz pro začátečníky",
                    uuid2, "Kyberbezpečnost", "Základy ochrany dat a systémů",
                ]
            );
            seededCourseUuids = [uuid1, uuid2];

            console.log("Seeded courses table with sample data.");
        } else {
            console.log("Courses already present — skipped auto seed.");
        }

        /* =======================
           COURSE MODULES (grouping)
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS course_modules (
                uuid CHAR(36) PRIMARY KEY,
                course_uuid CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT NULL,
                sort_order INT NOT NULL DEFAULT 0,
                is_unlocked TINYINT(1) NOT NULL DEFAULT 0,
                unlocked_at TIMESTAMP NULL,
                scheduled_unlock_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        try {
            await conn.execute(`
                ALTER TABLE course_modules ADD COLUMN scheduled_unlock_at TIMESTAMP NULL
            `);
        } catch {
            // ignore if column already exists
        }
        try {
            await conn.execute(`
                ALTER TABLE course_modules ADD COLUMN scheduled_unlock_local VARCHAR(20) NULL
            `);
        } catch {
            // ignore if column already exists
        }

        try {
            await conn.execute(`
                ALTER TABLE courses ADD COLUMN live_at_local VARCHAR(20) NULL
            `);
        } catch {
            // ignore if column already exists
        }

        /* =======================
           USERS
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS users (
                                                 id INT AUTO_INCREMENT PRIMARY KEY,
                                                 username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('default', 'lecturer', 'admin') DEFAULT 'default',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Migrate existing tables: add 'default' role if missing
        try {
            await conn.execute(`
                ALTER TABLE users MODIFY COLUMN role ENUM('default', 'lecturer', 'admin') DEFAULT 'default'
            `);
        } catch (_) {
            // Ignore if already migrated or column differs
        }

        const { SEED_ADMIN_USERNAME: seedUsername, SEED_ADMIN_PASSWORD: seedPassword } = await import("../config.js");
        const seedRole = "admin";

        const [userRows] = await conn.execute(
            "SELECT COUNT(*) AS count FROM users WHERE username = ?",
            [seedUsername]
        );
        const userExists = (userRows as any[])[0]?.count > 0;

        if (!userExists) {
            const hash = await bcrypt.hash(seedPassword, 10);
            await conn.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                [seedUsername, hash, seedRole]
            );
            console.log(`Seeded user '${seedUsername}' with role '${seedRole}'.`);
        }

        /* =======================
           MATERIALS
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS materials (
                                                     uuid CHAR(36) PRIMARY KEY,
                course_uuid CHAR(36) NOT NULL,
                type ENUM('file','url') NOT NULL,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                url TEXT,
                file_path VARCHAR(1024),
                file_name VARCHAR(255),
                mime_type VARCHAR(100),
                file_size BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Older databases might not have module_uuid; add it if missing.
        try {
            await conn.execute(`
                ALTER TABLE materials
                ADD COLUMN module_uuid CHAR(36) NULL,
                ADD CONSTRAINT fk_materials_module
                    FOREIGN KEY (module_uuid) REFERENCES course_modules(uuid) ON DELETE SET NULL
            `);
        } catch {
            // ignore if column or constraint already exists
        }

        const uploadsDir = path.join(process.cwd(), "apps", "server", "uploads", "materials");
        fs.mkdirSync(uploadsDir, { recursive: true });

        if (seededCourseUuids.length > 0) {
            // Get or create "Nezařazené" group for each course and assign materials to it
            for (const courseUuid of seededCourseUuids) {
                // Get or create "Nezařazené" group
                const [existingGroup] = await conn.execute(
                    "SELECT uuid FROM course_modules WHERE course_uuid = ? AND title = 'Nezařazené'",
                    [courseUuid]
                );
                
                let ungroupedGroupUuid: string;
                if ((existingGroup as any[]).length > 0) {
                    ungroupedGroupUuid = (existingGroup as any[])[0].uuid;
                } else {
                    ungroupedGroupUuid = randomUUID();
                    await conn.execute(
                        "INSERT INTO course_modules (uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at) VALUES (?, ?, 'Nezařazené', NULL, 0, 0, NULL)",
                        [ungroupedGroupUuid, courseUuid]
                    );
                }
                
                // Create one material per course
                const materialUuid = randomUUID();
                const fileName = "syllabus.pdf";
                const relativeFilePath = fileName;
                const physicalPath = path.join(uploadsDir, fileName);

                if (!fs.existsSync(physicalPath)) {
                    const placeholderPdf = Buffer.from(
                        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
                        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n" +
                        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n" +
                        "trailer\n<< /Root 1 0 R >>\n%%EOF\n"
                    );
                    fs.writeFileSync(physicalPath, placeholderPdf);
                }

                const stats = fs.statSync(physicalPath);
                
                await conn.execute(
                    `
                        INSERT INTO materials
                        (uuid, course_uuid, module_uuid, type, name, description, url, file_path, file_name, mime_type, file_size)
                        VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?)
                    `,
                    [materialUuid, courseUuid, ungroupedGroupUuid, "Syllabus", "Course syllabus", null, relativeFilePath, fileName, "application/pdf", stats.size]
                );
            }

            console.log("Seeded materials attached to newly created courses in 'Nezařazené' group.");
        } else {
            console.log("No new courses were created in this run — skipped auto-seeding materials.");
        }

        /* =======================
           QUIZZES (Phase 3)
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS quizzes (
                                                   uuid CHAR(36) PRIMARY KEY,
                course_uuid CHAR(36) NOT NULL,
                title VARCHAR(255) NOT NULL,
                count_only_last_answer TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Older databases might not have module_uuid; add it if missing.
        try {
            await conn.execute(`
                ALTER TABLE quizzes
                ADD COLUMN module_uuid CHAR(36) NULL,
                ADD CONSTRAINT fk_quizzes_module
                    FOREIGN KEY (module_uuid) REFERENCES course_modules(uuid) ON DELETE SET NULL
            `);
        } catch {
            // ignore if column or constraint already exists
        }

        // Older databases might not have count_only_last_answer; add it if missing.
        try {
            await conn.execute(`
                ALTER TABLE quizzes
                ADD COLUMN count_only_last_answer TINYINT(1) NOT NULL DEFAULT 0
            `);
        } catch {
            // ignore if column already exists
        }

        await conn.execute(`
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

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                                                         uuid CHAR(36) PRIMARY KEY,
                quiz_uuid CHAR(36) NOT NULL,
                score INT NOT NULL,
                max_score INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_uuid) REFERENCES quizzes(uuid) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
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

        /* =======================
           AUTO-SEED QUIZ FOR EVERY NEW COURSE
        ======================= */

        if (seededCourseUuids.length > 0) {
            for (const courseUuid of seededCourseUuids) {
                // Get or create "Nezařazené" group
                const [existingGroup] = await conn.execute(
                    "SELECT uuid FROM course_modules WHERE course_uuid = ? AND title = 'Nezařazené'",
                    [courseUuid]
                );
                
                let ungroupedGroupUuid: string;
                if ((existingGroup as any[]).length > 0) {
                    ungroupedGroupUuid = (existingGroup as any[])[0].uuid;
                } else {
                    ungroupedGroupUuid = randomUUID();
                    await conn.execute(
                        "INSERT INTO course_modules (uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at) VALUES (?, ?, 'Nezařazené', NULL, 0, 0, NULL)",
                        [ungroupedGroupUuid, courseUuid]
                    );
                }
                
                const quizUuid = randomUUID();
                const questionUuid = randomUUID();

                // Determine course name for nicer quiz title
                const [courseInfo] = await conn.execute(
                    "SELECT name FROM courses WHERE uuid = ?",
                    [courseUuid]
                );
                const courseName = (courseInfo as any[])[0]?.name || "Kurz";

                // Insert quiz with module_uuid
                await conn.execute(
                    `INSERT INTO quizzes (uuid, course_uuid, module_uuid, title) VALUES (?, ?, ?, ?)`,
                    [quizUuid, courseUuid, ungroupedGroupUuid, `Úvodní test – ${courseName}`]
                );

                // Insert one simple single-choice question
                await conn.execute(
                    `
                    INSERT INTO quiz_questions
                    (uuid, quiz_uuid, type, question, options_json, correct_index)
                    VALUES (?, ?, 'singleChoice', ?, ?, 0)
                    `,
                    [
                        questionUuid,
                        quizUuid,
                        "Co je hlavním cílem tohoto kurzu?",
                        JSON.stringify([
                            "Naučit se základy tématu kurzu",
                            "Stát se expertem za jeden den",
                            "Získat certifikát bez učení",
                            "Pouze se zaregistrovat"
                        ])
                    ]
                );

                console.log(`Seeded introductory quiz for course UUID ${courseUuid} in 'Nezařazené' group`);
            }
        }

        /* =======================
           FEED (Phase 4)
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS feed_items (
                uuid CHAR(36) PRIMARY KEY,
                course_uuid CHAR(36) NOT NULL,
                type ENUM('manual','system') NOT NULL,
                message TEXT NOT NULL,
                edited TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        // Add optional module/group link for feed items in older databases
        try {
            await conn.execute(`
                ALTER TABLE feed_items
                ADD COLUMN module_uuid CHAR(36) NULL,
                ADD CONSTRAINT fk_feed_module
                    FOREIGN KEY (module_uuid) REFERENCES course_modules(uuid) ON DELETE SET NULL
            `);
        } catch {
            // ignore if column or constraint already exists
        }

        /* =======================
           COURSE EVENTS (analytics)
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS course_events (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                course_uuid CHAR(36) NOT NULL,
                user_id INT NULL,
                material_uuid CHAR(36) NULL,
                event_type ENUM('material_download','link_click','course_open') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_uuid) REFERENCES courses(uuid) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (material_uuid) REFERENCES materials(uuid) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        /* =======================
           PRESETS
        ======================= */

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS material_presets (
                uuid CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                type ENUM('file','url') NOT NULL,
                description TEXT,
                url TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS quiz_presets (
                uuid CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                count_only_last_answer TINYINT(1) NOT NULL DEFAULT 0,
                questions_json JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        await conn.execute(`
            CREATE TABLE IF NOT EXISTS feed_presets (
                uuid CHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        /* =======================
           AUTO-SEED ONE FEED ITEM FOR EVERY NEW COURSE
        ======================= */

        if (seededCourseUuids.length > 0) {
            for (const courseUuid of seededCourseUuids) {
                // Get or create "Nezařazené" group
                const [existingGroup] = await conn.execute(
                    "SELECT uuid FROM course_modules WHERE course_uuid = ? AND title = 'Nezařazené'",
                    [courseUuid]
                );
                
                let ungroupedGroupUuid: string;
                if ((existingGroup as any[]).length > 0) {
                    ungroupedGroupUuid = (existingGroup as any[])[0].uuid;
                } else {
                    ungroupedGroupUuid = randomUUID();
                    await conn.execute(
                        "INSERT INTO course_modules (uuid, course_uuid, title, description, sort_order, is_unlocked, unlocked_at) VALUES (?, ?, 'Nezařazené', NULL, 0, 0, NULL)",
                        [ungroupedGroupUuid, courseUuid]
                    );
                }
                
                const feedUuid = randomUUID();

                const [courseInfo] = await conn.execute(
                    "SELECT name FROM courses WHERE uuid = ?",
                    [courseUuid]
                );
                const courseName = (courseInfo as any[])[0]?.name || "kurzu";

                await conn.execute(
                    `INSERT INTO feed_items (uuid, course_uuid, module_uuid, type, message)
                     VALUES (?, ?, ?, 'manual', ?)`,
                    [
                        feedUuid,
                        courseUuid,
                        ungroupedGroupUuid,
                        `Vítejte v kurzu ${courseName}! 🎉\n\nZde budeme sdílet důležité novinky, materiály a oznámení. Sledujte tento kanál průběžně.`
                    ]
                );

                console.log(`Seeded welcome feed item for course UUID ${courseUuid} in 'Nezařazené' group`);
            }
        }

        console.log("Database initialized successfully");
        console.log(
            "Database connected:",
            conn.config.user,
            "@",
            conn.config.host + ":" + conn.config.port,
            "?",
            conn.config.database
        );
    } catch (error) {
        console.error("Database initialization failed:", error);
        throw error;
    } finally {
        conn.release();
    }
}

export async function query<T = any>(sql: string, params: any[] = []) {
    const [rows] = await pool.execute(sql, params);
    return rows as T[];
}