import type { Request, Response } from "express";
import * as service from "../services/presets.service.js";

// Material Presets
export const listMaterialPresets = async (_req: Request, res: Response) => {
    const presets = await service.listMaterialPresets();
    res.json(presets);
};

export const getMaterialPreset = async (req: Request, res: Response) => {
    const preset = await service.getMaterialPreset(req.params.uuid);
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
};

export const createMaterialPreset = async (req: Request, res: Response) => {
    const { name, type, description, url } = req.body;
    if (!name || !type) return res.status(400).json({ error: "Name and type are required" });
    if (type !== "file" && type !== "url") return res.status(400).json({ error: "Type must be 'file' or 'url'" });
    if (type === "url" && !url) return res.status(400).json({ error: "URL is required for url type" });

    const preset = await service.createMaterialPreset({ name, type, description, url });
    res.status(201).json(preset);
};

export const updateMaterialPreset = async (req: Request, res: Response) => {
    const { name, type, description, url } = req.body;
    const preset = await service.updateMaterialPreset(req.params.uuid, { name, type, description, url });
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
};

export const deleteMaterialPreset = async (req: Request, res: Response) => {
    const deleted = await service.deleteMaterialPreset(req.params.uuid);
    if (!deleted) return res.status(404).json({ error: "Preset not found" });
    res.status(204).send();
};

// Quiz Presets
export const listQuizPresets = async (_req: Request, res: Response) => {
    const presets = await service.listQuizPresets();
    res.json(presets);
};

export const getQuizPreset = async (req: Request, res: Response) => {
    const preset = await service.getQuizPreset(req.params.uuid);
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
};

export const createQuizPreset = async (req: Request, res: Response) => {
    const { name, title, countOnlyLastAnswer, questions } = req.body;
    if (!name || !title) return res.status(400).json({ error: "Name and title are required" });
    if (!Array.isArray(questions)) return res.status(400).json({ error: "Questions must be an array" });

    const preset = await service.createQuizPreset({ name, title, countOnlyLastAnswer, questions });
    res.status(201).json(preset);
};

export const updateQuizPreset = async (req: Request, res: Response) => {
    const { name, title, countOnlyLastAnswer, questions } = req.body;
    const preset = await service.updateQuizPreset(req.params.uuid, { name, title, countOnlyLastAnswer, questions });
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
};

export const deleteQuizPreset = async (req: Request, res: Response) => {
    const deleted = await service.deleteQuizPreset(req.params.uuid);
    if (!deleted) return res.status(404).json({ error: "Preset not found" });
    res.status(204).send();
};

// Feed Presets
export const listFeedPresets = async (_req: Request, res: Response) => {
    const presets = await service.listFeedPresets();
    res.json(presets);
};

export const getFeedPreset = async (req: Request, res: Response) => {
    const preset = await service.getFeedPreset(req.params.uuid);
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
};

export const createFeedPreset = async (req: Request, res: Response) => {
    const { name, message } = req.body;
    if (!name || !message) return res.status(400).json({ error: "Name and message are required" });

    const preset = await service.createFeedPreset({ name, message });
    res.status(201).json(preset);
};

export const updateFeedPreset = async (req: Request, res: Response) => {
    const { name, message } = req.body;
    const preset = await service.updateFeedPreset(req.params.uuid, { name, message });
    if (!preset) return res.status(404).json({ error: "Preset not found" });
    res.json(preset);
};

export const deleteFeedPreset = async (req: Request, res: Response) => {
    const deleted = await service.deleteFeedPreset(req.params.uuid);
    if (!deleted) return res.status(404).json({ error: "Preset not found" });
    res.status(204).send();
};
