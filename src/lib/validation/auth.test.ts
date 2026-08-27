import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "./auth";

describe("signUpSchema", () => {
  it("accepts a valid email and an 8+ character password", () => {
    const result = signUpSchema.safeParse({ email: "user@example.com", password: "password123" });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase and trims whitespace", () => {
    const result = signUpSchema.parse({ email: "  User@Example.com  ", password: "password123" });
    expect(result.email).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    const result = signUpSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({ email: "user@example.com", password: "short1" });
    expect(result.success).toBe(false);
  });

  it("rejects a password longer than 72 characters (bcrypt truncation boundary)", () => {
    const result = signUpSchema.safeParse({ email: "user@example.com", password: "a".repeat(73) });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("only requires a non-empty password, no minimum length", () => {
    const result = signInSchema.safeParse({ email: "user@example.com", password: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ email: "user@example.com", password: "" });
    expect(result.success).toBe(false);
  });
});
