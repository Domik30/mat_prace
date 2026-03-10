import type { Request, Response } from "express";
import { registerUser } from "../services/register.service.js";

export function register(req: Request, res: Response) {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
    }

    registerUser(String(username), String(password))
        .then(() => res.status(201).json({ message: "Account created successfully" }))
        .catch((err) => {
            const msg = err?.message || "Registration failed";
            const status = msg.includes("already taken") ? 409 : 400;
            return res.status(status).json({ error: msg });
        });
}
