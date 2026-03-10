// src/controllers/materials.controller.ts
import type { Request, Response } from "express";
import * as service from "../services/materials.service.js";
import * as modulesService from "../services/modules.service.js";
import fs from "fs";
import path from "path";
import * as courseState from "../services/courseState.service.js";

const allowedExts = [
    ".pdf",
    ".docx",
    ".txt",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".mp4",
    ".mp3",
];

export const getAll = async (req: Request, res: Response) => {
    const courseUuid = req.params.uuid;
    const materials = await service.getAllForCourse(courseUuid);
    res.json(materials);
};

export const create = async (req: Request, res: Response) => {
    const courseUuid = req.params.uuid;

    const type = req.body.type || (req.file ? "file" : undefined);

    if (!type || (type !== "file" && type !== "url")) {
        return res.status(400).json({ error: "Invalid or missing type" });
    }

    const name = req.body.name;
    const description = req.body.description || null;
    let moduleUuid = req.body.moduleUuid || null;

    if (!name) return res.status(400).json({ error: "Name is required" });
    
    // If no moduleUuid provided, assign to "Nezařazené" group
    if (!moduleUuid) {
        const ungroupedGroup = await modulesService.getOrCreateUngroupedGroup(courseUuid);
        moduleUuid = ungroupedGroup.uuid;
    }

    if (type === "url") {
        const url = req.body.url;
        if (!url) return res.status(400).json({ error: "URL is required for url materials" });

        // basic URL validation
        try {
            // eslint-disable-next-line no-new
            new URL(url);
        } catch {
            return res.status(400).json({ error: "Invalid URL" });
        }

        const created = await service.createUrl(courseUuid, { name, description, url, moduleUuid });
        return res.status(200).json(created);
    }

    // file type
    const file = req.file;
    if (!file) {
        return res.status(400).json({ error: "File is required for file materials" });
    }

    // Validate extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExts.includes(ext)) {
        // Remove uploaded file
        try { await fs.promises.unlink(file.path); } catch {}
        return res.status(400).json({ error: "Unsupported file format" });
    }

    // size already limited by multer, but double-check
    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
        try { await fs.promises.unlink(file.path); } catch {}
        return res.status(400).json({ error: "File too large" });
    }

    const created = await service.createFile(
        courseUuid,
        {
            path: file.filename, // stored relative filename
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        },
        { name, description, moduleUuid }
    );

    res.status(200).json(created);
};

export const update = async (req: Request, res: Response) => {
    const { uuid: courseUuid, materialId } = req.params;

    // Determine if file replacement or metadata update
    const file = (req as any).file as Express.Multer.File | undefined;
    const name = req.body.name;
    const description = req.body.description;
    const type = req.body.type; // Can be 'file' or 'url'

    // Get existing material to check current type
    const existing = await service.getOne(materialId);
    if (!existing) return res.status(404).json({ error: "Material not found" });

    // If updating URL type (JSON or form-data without file)
    if (!file) {
        // If changing from file to URL, we need to delete the file
        if (existing.type === "file" && type === "url") {
            if (!req.body.url) {
                return res.status(400).json({ error: "URL is required when changing to URL type" });
            }
            const updated = await service.changeTypeToUrl(materialId, { name, description, url: req.body.url });
            if (!updated) return res.status(404).json({ error: "Material not found" });
            return res.json(updated);
        }
        // metadata update (works for URL and file metadata)
        const updated = await service.updateMetadata(materialId, { name, description, url: req.body.url });
        if (!updated) return res.status(404).json({ error: "Material not found" });
        return res.json(updated);
    }

    // file replacement or changing from URL to file
    // Validate extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ext) {
        try { await fs.promises.unlink(file.path); } catch {}
        return res.status(400).json({ error: "Unsupported file format" });
    }
    if (!allowedExts.includes(ext)) {
        try { await fs.promises.unlink(file.path); } catch {}
        return res.status(400).json({ error: "Unsupported file format" });
    }

    const maxSize = 30 * 1024 * 1024;
    if (file.size > maxSize) {
        try { await fs.promises.unlink(file.path); } catch {}
        return res.status(400).json({ error: "File too large" });
    }

    // If changing from URL to file, use changeTypeToFile
    if (existing.type === "url" && type === "file") {
        const updated = await service.changeTypeToFile(materialId, {
            path: file.filename,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        }, { name, description });
        if (!updated) {
            try { await fs.promises.unlink(file.path); } catch {}
            return res.status(404).json({ error: "Material not found" });
        }
        return res.json(updated);
    }

    // Regular file replacement
    const updated = await service.replaceFile(materialId, {
        path: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
    }, { name, description });

    if (!updated) {
        try { await fs.promises.unlink(file.path); } catch {}
        return res.status(404).json({ error: "Material not found" });
    }

    res.json(updated);
};

export const remove = async (req: Request, res: Response) => {
    const { materialId } = req.params;
    const deleted = await service.remove(materialId);
    if (!deleted) return res.status(404).json({ error: "Material not found" });
    res.status(204).send();
};

export const setModule = async (req: Request, res: Response) => {
    const { materialId } = req.params;
    const { moduleUuid } = req.body as { moduleUuid?: string | null };
    const updated = await service.setModule(materialId, moduleUuid ?? null);
    if (!updated) return res.status(404).json({ error: "Material not found" });

    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "material-moved",
        entityType: "material",
        uuid: materialId,
    });

    res.json(updated);
};