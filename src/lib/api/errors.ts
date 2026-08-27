import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Base class for errors that map directly to an HTTP status code. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(message, 400);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You don't have access to this resource") {
    super(message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

/**
 * Converts any error thrown inside a route handler into a JSON response with
 * an appropriate status code, without ever leaking internals (stack traces,
 * DB errors) to the client. Route handlers should wrap their body in a
 * try/catch and return `handleApiError(error)` from the catch clause.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
