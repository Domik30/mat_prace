import pool from "../db/index.js";

export async function fetchCourses() {
    const [rows] = await pool.execute(
        "SELECT * FROM courses ORDER BY created_at DESC"
    );
    return rows;
}

export async function fetchCourseByUuid(uuid: string) {
    const [rows]: any = await pool.execute(
        "SELECT * FROM courses WHERE uuid = ?",
        [uuid]
    );
    return rows[0] || null;
}

export async function insertCourse(
    uuid: string,
    name: string,
    description?: string
) {
    await pool.execute(
        "INSERT INTO courses (uuid, name, description) VALUES (?, ?, ?)",
        [uuid, name, description || null]
    );
}

export async function editCourse(
    uuid: string,
    name: string,
    description?: string
) {
    const [result]: any = await pool.execute(
        "UPDATE courses SET name = ?, description = ? WHERE uuid = ?",
        [name, description || null, uuid]
    );

    return result.affectedRows > 0;
}

export async function removeCourse(uuid: string) {
    const [result]: any = await pool.execute(
        "DELETE FROM courses WHERE uuid = ?",
        [uuid]
    );

    return result.affectedRows > 0;
}
