import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { signUpSchema } from "@/lib/validation/auth";
import { ConflictError, handleApiError } from "@/lib/api/errors";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json().catch(() => null);
    const { email, password } = signUpSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError("An account with that email already exists");
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true },
    });

    await setSessionCookie({ userId: user.id, email: user.email });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
