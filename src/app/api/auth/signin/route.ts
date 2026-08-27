import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { UNKNOWN_USER_DUMMY_HASH, verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { signInSchema } from "@/lib/validation/auth";
import { UnauthorizedError, handleApiError } from "@/lib/api/errors";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => null);
    const { email, password } = signInSchema.parse(body);

    const user = await db.user.findUnique({ where: { email } });

    // Always run the comparison, even for an unknown email, against a dummy
    // hash — this keeps sign-in's response time independent of whether the
    // account exists, and keeps the "invalid credentials" message identical
    // for both cases so the API never confirms which emails are registered.
    const passwordIsValid = await verifyPassword(password, user?.passwordHash ?? UNKNOWN_USER_DUMMY_HASH);

    if (!user || !passwordIsValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    await setSessionCookie({ userId: user.id, email: user.email });

    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    return handleApiError(error);
  }
}
