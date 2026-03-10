/**
 * Basic app and auth configuration.
 * User accounts are stored in the database; these values are used only for:
 * - JWT signing
 * - Optional initial admin seed (if DB is empty)
 */
export const JWT_SECRET = process.env.JWT_SECRET || "dev_key_123";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

/** Initial admin credentials for DB seed only (when no users exist) */
export const SEED_ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || "lecturer";
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "TdA26!";
