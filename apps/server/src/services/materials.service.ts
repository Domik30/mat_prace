import pool from "../db/index.js";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import * as feedService from "./feed.service.js";

const uploadsFolder = path.join(process.cwd(), "apps", "server", "uploads", "materials");

// Ensure table exists (defensive; table is also created during initDatabase)
async function ensureTable() {
    await pool.execute(`
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
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Ensure module_uuid exists for grouping; ignore if it already does.
    try {
        await pool.execute(`
            ALTER TABLE materials
            ADD COLUMN module_uuid CHAR(36) NULL,
            ADD CONSTRAINT fk_materials_module
                FOREIGN KEY (module_uuid) REFERENCES course_modules(uuid) ON DELETE SET NULL
        `);
    } catch {
        // ignore
    }
}

export async function getAllForCourse(courseUuid: string) {
    await ensureTable();
    const [rows]: any = await pool.execute(
        "SELECT uuid, course_uuid, module_uuid, type, name, description, url, file_path, file_name, mime_type AS mimeType, file_size AS size, created_at AS createdAt FROM materials WHERE course_uuid = ? ORDER BY created_at DESC",
        [courseUuid]
    );

    // Map file_path to publicly accessible fileUrl when present
    return rows.map((r: any) => {
        const base: any = {
            uuid: r.uuid,
            courseUuid: r.course_uuid,
            moduleUuid: r.module_uuid ?? null,
            type: r.type,
            name: r.name,
            description: r.description,
            url: r.url,
            fileName: r.file_name,
            mimeType: r.mimeType,
            size: r.size,
            createdAt: r.createdAt,
        };

        if (r.file_path) {
            base.fileUrl = `/uploads/materials/${r.file_path}`;
            base.filePath = r.file_path;
        }

        return base;
    });
}

export async function getOne(uuid: string) {
    await ensureTable();
    const [rows]: any = await pool.execute(
        "SELECT uuid, course_uuid, type, name, description, url, file_path, file_name, mime_type AS mimeType, file_size AS size, created_at AS createdAt FROM materials WHERE uuid = ?",
        [uuid]
    );
    const row = rows[0];
    if (!row) return null;
    if (row.file_path) {
        row.fileUrl = `/uploads/materials/${row.file_path}`;
    }
    return row;
}

export async function createUrl(
    courseUuid: string,
    data: { name: string; description?: string | null; url: string; moduleUuid?: string | null }
) {
    await ensureTable();
    
    // If no moduleUuid provided, assign to "Nezařazené" group
    let finalModuleUuid = data.moduleUuid ?? null;
    if (!finalModuleUuid) {
        const modulesService = await import("./modules.service.js");
        const ungroupedGroup = await modulesService.getOrCreateUngroupedGroup(courseUuid);
        finalModuleUuid = ungroupedGroup.uuid;
    }
    
    const uuid = crypto.randomUUID();
    await pool.execute(
        "INSERT INTO materials (uuid, course_uuid, module_uuid, type, name, description, url) VALUES (?, ?, ?, 'url', ?, ?, ?)",
        [uuid, courseUuid, finalModuleUuid, data.name, data.description ?? null, data.url]
    );
    const created = await getOne(uuid);
    
    // Only create system event if material is not in "Nezařazené" group
    if (finalModuleUuid) {
        const [moduleRows] = await pool.execute<Array<{ title: string }>>(
            "SELECT title FROM course_modules WHERE uuid = ?",
            [finalModuleUuid]
        );
        const moduleTitle = moduleRows[0]?.title;
        if (moduleTitle !== 'Nezařazené') {
            await feedService.createSystemEvent(courseUuid, `New material added: ${data.name}`);
        }
    }
    
    return created;
}

export async function createFile(
    courseUuid: string,
    file: { path: string; originalName: string; mimeType: string; size: number },
    meta: { name: string; description?: string | null; moduleUuid?: string | null }
) {
    await ensureTable();
    
    // If no moduleUuid provided, assign to "Nezařazené" group
    let finalModuleUuid = meta.moduleUuid ?? null;
    if (!finalModuleUuid) {
        const modulesService = await import("./modules.service.js");
        const ungroupedGroup = await modulesService.getOrCreateUngroupedGroup(courseUuid);
        finalModuleUuid = ungroupedGroup.uuid;
    }
    
    const uuid = crypto.randomUUID();
    await pool.execute(
        "INSERT INTO materials (uuid, course_uuid, module_uuid, type, name, description, file_path, file_name, mime_type, file_size) VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?, ?)",
        [
            uuid,
            courseUuid,
            finalModuleUuid,
            meta.name,
            meta.description ?? null,
            file.path,
            file.originalName,
            file.mimeType,
            file.size,
        ]
    );
    const created = await getOne(uuid);
    
    // Only create system event if material is not in "Nezařazené" group
    if (finalModuleUuid) {
        const [moduleRows] = await pool.execute<Array<{ title: string }>>(
            "SELECT title FROM course_modules WHERE uuid = ?",
            [finalModuleUuid]
        );
        const moduleTitle = moduleRows[0]?.title;
        if (moduleTitle !== 'Nezařazené') {
            await feedService.createSystemEvent(courseUuid, `New material added: ${meta.name}`);
        }
    }
    
    return created;
}

export async function updateMetadata(uuid: string, data: { name?: string; description?: string | null; url?: string | null }) {
    await ensureTable();
    // First, get existing to know type
    const existing = await getOne(uuid);
    if (!existing) return null;

    if (existing.type === "url") {
        const name = data.name ?? existing.name;
        const description = data.description ?? existing.description;
        const url = data.url ?? existing.url;
        await pool.execute(
            "UPDATE materials SET name = ?, description = ?, url = ? WHERE uuid = ?",
            [name, description, url, uuid]
        );
    } else {
        // file type: only update metadata (name/description)
        const name = data.name ?? existing.name;
        const description = data.description ?? existing.description;
        await pool.execute(
            "UPDATE materials SET name = ?, description = ? WHERE uuid = ?",
            [name, description, uuid]
        );
    }

    return getOne(uuid);
}

export async function setModule(uuid: string, moduleUuid: string | null) {
    await ensureTable();
    await pool.execute(
        "UPDATE materials SET module_uuid = ? WHERE uuid = ?",
        [moduleUuid, uuid]
    );
    return getOne(uuid);
}

export async function replaceFile(uuid: string, file: { path: string; originalName: string; mimeType: string; size: number }, meta: { name?: string; description?: string | null }) {
    await ensureTable();
    const existing = await getOne(uuid);
    if (!existing) return null;

    // delete old file if present
    if (existing.file_path) {
        try {
            const oldFullPath = path.join(uploadsFolder, existing.file_path);
            await fs.promises.unlink(oldFullPath);
        } catch {
            // ignore
        }
    }

    const name = meta.name ?? existing.name;
    const description = meta.description ?? existing.description;

    await pool.execute(
        "UPDATE materials SET type = 'file', name = ?, description = ?, url = NULL, file_path = ?, file_name = ?, mime_type = ?, file_size = ? WHERE uuid = ?",
        [name, description, file.path, file.originalName, file.mimeType, file.size, uuid]
    );

    return getOne(uuid);
}

export async function changeTypeToFile(uuid: string, file: { path: string; originalName: string; mimeType: string; size: number }, meta: { name?: string; description?: string | null }) {
    await ensureTable();
    const existing = await getOne(uuid);
    if (!existing) return null;

    const name = meta.name ?? existing.name;
    const description = meta.description ?? existing.description;

    await pool.execute(
        "UPDATE materials SET type = 'file', file_path = ?, file_name = ?, mime_type = ?, file_size = ?, url = NULL, name = ?, description = ? WHERE uuid = ?",
        [file.path, file.originalName, file.mimeType, file.size, name, description, uuid]
    );

    return getOne(uuid);
}

export async function changeTypeToUrl(uuid: string, data: { name?: string; description?: string | null; url: string }) {
    await ensureTable();
    const existing = await getOne(uuid);
    if (!existing) return null;

    // Delete old file if present
    if (existing.file_path) {
        try {
            const oldFullPath = path.join(uploadsFolder, existing.file_path);
            await fs.promises.unlink(oldFullPath);
        } catch {
            // ignore if file doesn't exist
        }
    }

    const name = data.name ?? existing.name;
    const description = data.description ?? existing.description;

    await pool.execute(
        "UPDATE materials SET type = 'url', url = ?, file_path = NULL, file_name = NULL, mime_type = NULL, file_size = NULL, name = ?, description = ? WHERE uuid = ?",
        [data.url, name, description, uuid]
    );

    return getOne(uuid);
}

export async function remove(uuid: string) {
    await ensureTable();
    const mat = await getOne(uuid);
    if (!mat) return false;

    // delete file on disk if exists
    if (mat.file_path) {
        try {
            const full = path.join(uploadsFolder, mat.file_path);
            await fs.promises.unlink(full);
        } catch {
            // ignore
        }
    }

    const [result]: any = await pool.execute(
        "DELETE FROM materials WHERE uuid = ?",
        [uuid]
    );

    return result.affectedRows > 0;
}