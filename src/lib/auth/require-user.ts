import { getSession } from "@/lib/auth/session";
import { UnauthorizedError } from "@/lib/api/errors";
import type { SessionPayload } from "@/lib/auth/jwt";

/**
 * Resolves the current session or throws `UnauthorizedError`. Every API
 * route that touches user data calls this first and scopes its Prisma
 * query to the returned `userId` — the server, not the client, is the one
 * enforcing that a user can only ever see their own notes and tags.
 */
export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new UnauthorizedError();
  }
  return session;
}
