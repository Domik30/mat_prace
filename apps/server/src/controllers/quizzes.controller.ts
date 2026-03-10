import type { Request, Response } from "express";
import * as service from "../services/quizzes.service.js";
import * as modulesService from "../services/modules.service.js";
import * as courseState from "../services/courseState.service.js";

function validateQuestions(raw: any[]): { valid: boolean; normalized?: any[]; error?: string } {
    if (!Array.isArray(raw) || raw.length === 0) {
        return { valid: false, error: "Questions are required" };
    }

    const normalized = [];

    for (const q of raw) {
        if (!q?.type || (q.type !== "singleChoice" && q.type !== "multipleChoice")) {
            return { valid: false, error: "Question type must be singleChoice or multipleChoice" };
        }
        if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
            return { valid: false, error: "Each question needs text and at least 2 options" };
        }
        if (q.type === "singleChoice" && typeof q.correctIndex !== "number") {
            return { valid: false, error: "singleChoice requires correctIndex" };
        }
        if (q.type === "multipleChoice" && (!Array.isArray(q.correctIndices) || q.correctIndices.length === 0)) {
            return { valid: false, error: "multipleChoice requires correctIndices array" };
        }

        normalized.push({
            uuid: q.uuid,
            type: q.type,
            question: q.question,
            options: q.options,
            correctIndex: q.type === "singleChoice" ? q.correctIndex : undefined,
            correctIndices: q.type === "multipleChoice" ? q.correctIndices : undefined,
        });
    }

    return { valid: true, normalized };
}

export const listForCourse = async (req: Request, res: Response) => {
    const userId = (req as any).user?.userId as number | undefined;
    const quizzes = await service.listForCourse(req.params.uuid, userId);
    res.json(quizzes);
};

export const getOne = async (req: Request, res: Response) => {
    const quiz = await service.getOne(req.params.quizId);
    if (!quiz || quiz.courseUuid !== req.params.uuid) {
        return res.status(404).json({ error: "Quiz not found" });
    }
    res.json(quiz);
};

export const create = async (req: Request, res: Response) => {
    const { title, questions, countOnlyLastAnswer, moduleUuid } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const validated = validateQuestions(questions);
    if (!validated.valid) return res.status(400).json({ error: validated.error });

    // If no moduleUuid provided, assign to "Nezařazené" group
    let finalModuleUuid = moduleUuid || null;
    if (!finalModuleUuid) {
        const ungroupedGroup = await modulesService.getOrCreateUngroupedGroup(req.params.uuid);
        finalModuleUuid = ungroupedGroup.uuid;
    }

    const quiz = await service.create(req.params.uuid, { title, questions: validated.normalized!, countOnlyLastAnswer: !!countOnlyLastAnswer, moduleUuid: finalModuleUuid });
    res.status(200).json(quiz);
};

export const update = async (req: Request, res: Response) => {
    const { title, questions, countOnlyLastAnswer, moduleUuid } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const validated = validateQuestions(questions);
    if (!validated.valid) return res.status(400).json({ error: validated.error });

    const updated = await service.update(req.params.quizId, { title, questions: validated.normalized!, countOnlyLastAnswer: !!countOnlyLastAnswer, moduleUuid: moduleUuid || null });
    if (!updated || updated.courseUuid !== req.params.uuid) {
        return res.status(404).json({ error: "Quiz not found" });
    }
    res.json(updated);
};

export const remove = async (req: Request, res: Response) => {
    const deleted = await service.remove(req.params.quizId);
    if (!deleted) return res.status(404).json({ error: "Quiz not found" });
    res.status(204).send();
};

export const getStats = async (req: Request, res: Response) => {
    const stats = await service.getStats(req.params.quizId);
    if (!stats) return res.status(404).json({ error: "Quiz not found" });
    const quiz = await service.getOne(req.params.quizId);
    if (!quiz || quiz.courseUuid !== req.params.uuid) {
        return res.status(404).json({ error: "Quiz not found" });
    }
    res.json(stats);
};

export const submit = async (req: Request, res: Response) => {
    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: "Answers array is required" });

    const userId = (req as any).user?.userId as number | undefined;
    try {
        const result = await service.submit(req.params.quizId, answers, userId);
        if (!result) return res.status(404).json({ error: "Quiz not found" });

        // Notify SSE subscribers so quiz attempt counts & stats update in dashboards
        const quiz = await service.getOne(req.params.quizId);
        if (quiz) {
            courseState.notify(quiz.courseUuid, {
                type: "refresh",
                reason: "quiz-submitted",
                entityType: "quiz",
                uuid: req.params.quizId,
            });
        }

        res.json(result);
    } catch (error: any) {
        if (error.message === "Tento kvíz lze vyplnit pouze jednou.") {
            return res.status(403).json({ error: error.message });
        }
        throw error;
    }
};

export const setModule = async (req: Request, res: Response) => {
    const { moduleUuid } = req.body as { moduleUuid?: string | null };
    const updated = await service.setModule(req.params.quizId, moduleUuid ?? null);
    if (!updated || updated.courseUuid !== req.params.uuid) {
        return res.status(404).json({ error: "Quiz not found" });
    }

    courseState.notify(req.params.uuid, {
        type: "refresh",
        reason: "quiz-moved",
        entityType: "quiz",
        uuid: req.params.quizId,
    });

    res.json(updated);
};

export const getParticipantAnswers = async (req: Request, res: Response) => {
    const quiz = await service.getOne(req.params.quizId);
    if (!quiz || quiz.courseUuid !== req.params.uuid) {
        return res.status(404).json({ error: "Quiz not found" });
    }
    const answers = await service.getParticipantAnswers(req.params.quizId);
    if (!answers) return res.status(404).json({ error: "Quiz not found" });
    res.json(answers);
};