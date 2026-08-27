import bcrypt from "bcryptjs";

// 12 rounds is a common baseline for bcrypt in 2026 — expensive enough to
// resist offline brute-force, cheap enough to keep signup/login snappy.
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// A pre-computed bcrypt hash with no corresponding real password. Sign-in
// compares against this when the email isn't found, so the response takes
// roughly the same time either way and doesn't leak which emails exist.
export const UNKNOWN_USER_DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeOgxT8FQIZ3vqQzXwqYVKUM.YFQKzCXlG";
