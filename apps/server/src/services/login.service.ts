import bcrypt from "bcrypt";
import pool from "../db/index.js";
import { createToken } from "../jwt.js";
import type { RowDataPacket } from "mysql2";

interface UserRow extends RowDataPacket {
    id: number;
    username: string;
    password_hash: string;
    role: string;
}

const DASHBOARD_ROLES = ["lecturer", "admin"];

export async function loginUser(username: string, password: string): Promise<{ token: string; role: string }> {
    const [rows] = await pool.execute<UserRow[]>(
        "SELECT id, username, password_hash, role FROM users WHERE username = ?",
        [username]
    );

    const user = rows[0];
    if (!user) {
        throw new Error("Invalid credentials");
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
        throw new Error("Invalid credentials");
    }

    const token = createToken({ username: user.username, userId: user.id, role: user.role });
    return { token, role: user.role };
}

export function canAccessDashboard(role: string | undefined): boolean {
    return !!role && DASHBOARD_ROLES.includes(role);
}
