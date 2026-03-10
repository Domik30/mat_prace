import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "./config.js";

export interface TokenPayload {
    username: string;
    userId?: number;
    role?: string;
}

export function createToken(payload: TokenPayload): string {
    // Guard against undefined values (best practice)
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in config");
    }

    // Cast expiresIn so TypeScript accepts it
    // Option A – most common & clean
    const signOptions: jwt.SignOptions = {
        expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"], // or as any / as unknown as number
    };

    // Option B – shorter (works in most recent @types/jsonwebtoken versions)
    // const signOptions = { expiresIn: JWT_EXPIRES_IN ?? "1h" } as const;

    return jwt.sign(payload, JWT_SECRET, signOptions);
}

export function verifyToken(token: string): TokenPayload {
    // Also guard the secret here
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in config");
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded !== "object" || decoded === null || !("username" in decoded)) {
        throw new Error("Invalid token payload");
    }

    return decoded as TokenPayload;
}