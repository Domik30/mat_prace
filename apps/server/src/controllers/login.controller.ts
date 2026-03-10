// src/controllers/login.controller.ts
import type { Request, Response } from "express";
import { loginUser } from "../services/login.service.js";

export async function login(req: Request, res: Response) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing credentials" });
    }

    try {
        const { token, role } = await loginUser(String(username), String(password));
        return res.json({ token, role });
    } catch {
        return res.status(401).json({ error: "Invalid credentials" });
    }
}