import bcrypt from "bcrypt";
import pool from "../db/index.js";
import type { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
    count: number;
}

export async function registerUser(username: string, password: string): Promise<void> {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) {
        throw new Error("Username must be at least 2 characters");
    }
    if (!password || password.length < 6) {
        throw new Error("Password must be at least 6 characters");
    }

    const [existing] = await pool.execute<UserRow[]>(
        "SELECT COUNT(*) AS count FROM users WHERE username = ?",
        [trimmed]
    );

    if ((existing as UserRow[])[0]?.count > 0) {
        throw new Error("Username already taken");
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.execute(
        "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'default')",
        [trimmed, hash]
    );
}
