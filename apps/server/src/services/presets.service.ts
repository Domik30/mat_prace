import pool from "../db/index.js";
import crypto from "crypto";

type MaterialPreset = {
    uuid: string;
    name: string;
    type: "file" | "url";
    description?: string | null;
    url?: string | null;
    createdAt: string;
    updatedAt: string;
};

type QuizPreset = {
    uuid: string;
    name: string;
    title: string;
    countOnlyLastAnswer: boolean;
    questions: Array<{
        type: "singleChoice" | "multipleChoice";
        question: string;
        options: string[];
        correctIndex?: number;
        correctIndices?: number[];
    }>;
    createdAt: string;
    updatedAt: string;
};

type FeedPreset = {
    uuid: string;
    name: string;
    message: string;
    createdAt: string;
    updatedAt: string;
};

async function ensurePresetsTables() {
    // Tables are created in initDatabase, but we ensure they exist here too
    await pool.execute(`
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

    await pool.execute(`
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

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS feed_presets (
            uuid CHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
}

// Material Presets
export async function listMaterialPresets(): Promise<MaterialPreset[]> {
    await ensurePresetsTables();
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, name, type, description, url, created_at, updated_at FROM material_presets ORDER BY created_at DESC"
    );
    return rows.map((r: any) => ({
        uuid: r.uuid,
        name: r.name,
        type: r.type,
        description: r.description ?? null,
        url: r.url ?? null,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    }));
}

export async function getMaterialPreset(uuid: string): Promise<MaterialPreset | null> {
    await ensurePresetsTables();
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, name, type, description, url, created_at, updated_at FROM material_presets WHERE uuid = ?",
        [uuid]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        uuid: r.uuid,
        name: r.name,
        type: r.type,
        description: r.description ?? null,
        url: r.url ?? null,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    };
}

export async function createMaterialPreset(data: {
    name: string;
    type: "file" | "url";
    description?: string | null;
    url?: string | null;
}): Promise<MaterialPreset> {
    await ensurePresetsTables();
    const uuid = crypto.randomUUID();
    await pool.execute(
        "INSERT INTO material_presets (uuid, name, type, description, url) VALUES (?, ?, ?, ?, ?)",
        [uuid, data.name, data.type, data.description ?? null, data.url ?? null]
    );
    return (await getMaterialPreset(uuid))!;
}

export async function updateMaterialPreset(
    uuid: string,
    data: { name?: string; type?: "file" | "url"; description?: string | null; url?: string | null }
): Promise<MaterialPreset | null> {
    await ensurePresetsTables();
    const existing = await getMaterialPreset(uuid);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
        updates.push("name = ?");
        values.push(data.name);
    }
    if (data.type !== undefined) {
        updates.push("type = ?");
        values.push(data.type);
    }
    if (data.description !== undefined) {
        updates.push("description = ?");
        values.push(data.description ?? null);
    }
    if (data.url !== undefined) {
        updates.push("url = ?");
        values.push(data.url ?? null);
    }

    if (updates.length > 0) {
        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(uuid);
        await pool.execute(`UPDATE material_presets SET ${updates.join(", ")} WHERE uuid = ?`, values);
    }

    return await getMaterialPreset(uuid);
}

export async function deleteMaterialPreset(uuid: string): Promise<boolean> {
    await ensurePresetsTables();
    const [result]: any = await pool.execute("DELETE FROM material_presets WHERE uuid = ?", [uuid]);
    return result.affectedRows > 0;
}

// Quiz Presets
export async function listQuizPresets(): Promise<QuizPreset[]> {
    await ensurePresetsTables();
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, name, title, count_only_last_answer, questions_json, created_at, updated_at FROM quiz_presets ORDER BY created_at DESC"
    );
    return rows.map((r: any) => {
        let questions = [];
        try {
            questions = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
        } catch {
            questions = [];
        }
        return {
            uuid: r.uuid,
            name: r.name,
            title: r.title,
            countOnlyLastAnswer: !!r.count_only_last_answer,
            questions,
            createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
            updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
        };
    });
}

export async function getQuizPreset(uuid: string): Promise<QuizPreset | null> {
    await ensurePresetsTables();
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, name, title, count_only_last_answer, questions_json, created_at, updated_at FROM quiz_presets WHERE uuid = ?",
        [uuid]
    );
    const r = rows[0];
    if (!r) return null;
    let questions = [];
    try {
        questions = typeof r.questions_json === "string" ? JSON.parse(r.questions_json) : r.questions_json;
    } catch {
        questions = [];
    }
    return {
        uuid: r.uuid,
        name: r.name,
        title: r.title,
        countOnlyLastAnswer: !!r.count_only_last_answer,
        questions,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    };
}

export async function createQuizPreset(data: {
    name: string;
    title: string;
    countOnlyLastAnswer?: boolean;
    questions: Array<{
        type: "singleChoice" | "multipleChoice";
        question: string;
        options: string[];
        correctIndex?: number;
        correctIndices?: number[];
    }>;
}): Promise<QuizPreset> {
    await ensurePresetsTables();
    const uuid = crypto.randomUUID();
    await pool.execute(
        "INSERT INTO quiz_presets (uuid, name, title, count_only_last_answer, questions_json) VALUES (?, ?, ?, ?, ?)",
        [uuid, data.name, data.title, data.countOnlyLastAnswer ? 1 : 0, JSON.stringify(data.questions)]
    );
    return (await getQuizPreset(uuid))!;
}

export async function updateQuizPreset(
    uuid: string,
    data: {
        name?: string;
        title?: string;
        countOnlyLastAnswer?: boolean;
        questions?: Array<{
            type: "singleChoice" | "multipleChoice";
            question: string;
            options: string[];
            correctIndex?: number;
            correctIndices?: number[];
        }>;
    }
): Promise<QuizPreset | null> {
    await ensurePresetsTables();
    const existing = await getQuizPreset(uuid);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
        updates.push("name = ?");
        values.push(data.name);
    }
    if (data.title !== undefined) {
        updates.push("title = ?");
        values.push(data.title);
    }
    if (data.countOnlyLastAnswer !== undefined) {
        updates.push("count_only_last_answer = ?");
        values.push(data.countOnlyLastAnswer ? 1 : 0);
    }
    if (data.questions !== undefined) {
        updates.push("questions_json = ?");
        values.push(JSON.stringify(data.questions));
    }

    if (updates.length > 0) {
        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(uuid);
        await pool.execute(`UPDATE quiz_presets SET ${updates.join(", ")} WHERE uuid = ?`, values);
    }

    return await getQuizPreset(uuid);
}

export async function deleteQuizPreset(uuid: string): Promise<boolean> {
    await ensurePresetsTables();
    const [result]: any = await pool.execute("DELETE FROM quiz_presets WHERE uuid = ?", [uuid]);
    return result.affectedRows > 0;
}

// Feed Presets
export async function listFeedPresets(): Promise<FeedPreset[]> {
    await ensurePresetsTables();
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, name, message, created_at, updated_at FROM feed_presets ORDER BY created_at DESC"
    );
    return rows.map((r: any) => ({
        uuid: r.uuid,
        name: r.name,
        message: r.message,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    }));
}

export async function getFeedPreset(uuid: string): Promise<FeedPreset | null> {
    await ensurePresetsTables();
    const [rows]: any[] = await pool.execute(
        "SELECT uuid, name, message, created_at, updated_at FROM feed_presets WHERE uuid = ?",
        [uuid]
    );
    const r = rows[0];
    if (!r) return null;
    return {
        uuid: r.uuid,
        name: r.name,
        message: r.message,
        createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
        updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    };
}

export async function createFeedPreset(data: { name: string; message: string }): Promise<FeedPreset> {
    await ensurePresetsTables();
    const uuid = crypto.randomUUID();
    await pool.execute("INSERT INTO feed_presets (uuid, name, message) VALUES (?, ?, ?)", [
        uuid,
        data.name,
        data.message,
    ]);
    return (await getFeedPreset(uuid))!;
}

export async function updateFeedPreset(
    uuid: string,
    data: { name?: string; message?: string }
): Promise<FeedPreset | null> {
    await ensurePresetsTables();
    const existing = await getFeedPreset(uuid);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
        updates.push("name = ?");
        values.push(data.name);
    }
    if (data.message !== undefined) {
        updates.push("message = ?");
        values.push(data.message);
    }

    if (updates.length > 0) {
        updates.push("updated_at = CURRENT_TIMESTAMP");
        values.push(uuid);
        await pool.execute(`UPDATE feed_presets SET ${updates.join(", ")} WHERE uuid = ?`, values);
    }

    return await getFeedPreset(uuid);
}

export async function deleteFeedPreset(uuid: string): Promise<boolean> {
    await ensurePresetsTables();
    const [result]: any = await pool.execute("DELETE FROM feed_presets WHERE uuid = ?", [uuid]);
    return result.affectedRows > 0;
}
