import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt.js";
import { canAccessDashboard } from "./services/login.service.js";

export function auth(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = header.split(" ")[1];

    try {
        const payload = verifyToken(token);
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/**
 * Optional auth: attaches user to req if token is valid.
 * If no token is provided, request continues as anonymous.
 * If token is invalid, return 401.
 */
export function authOptional(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return next();
    }

    const token = header.split(" ")[1];

    try {
        const payload = verifyToken(token);
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

/** Requires auth AND dashboard role (lecturer/admin). Rejects default/student. */
export function requireDashboard(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const token = header.split(" ")[1];

    try {
        const payload = verifyToken(token);
        if (!canAccessDashboard(payload.role)) {
            return res.status(403).json({ error: "Access denied. Dashboard requires lecturer or admin role." });
        }
        (req as any).user = payload;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}