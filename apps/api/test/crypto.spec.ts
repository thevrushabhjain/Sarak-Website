import { describe, expect, it } from "vitest";
import * as c from "../src/lib/crypto";

describe("crypto", () => {
  it("hashes then verifies a password", async () => {
    const stored = await c.hashPassword("correct horse battery staple");
    expect(stored.startsWith("pbkdf2$100000$")).toBe(true);
    expect(await c.verifyPassword("correct horse battery staple", stored)).toBe(true);
    expect(await c.verifyPassword("wrong", stored)).toBe(false);
  });

  it("produces unique salts", async () => {
    const a = await c.hashPassword("same");
    const b = await c.hashPassword("same");
    expect(a).not.toBe(b);
  });

  it("compares strings in constant time semantics", () => {
    expect(c.timingSafeEq("abc", "abc")).toBe(true);
    expect(c.timingSafeEq("abc", "abd")).toBe(false);
    expect(c.timingSafeEq("abc", "abcd")).toBe(false);
  });

  it("tokens are unique and urlsafe", async () => {
    const t1 = await c.generateToken();
    const t2 = await c.generateToken();
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("sha256Hex is deterministic", async () => {
    expect(await c.sha256Hex("x")).toBe(await c.sha256Hex("x"));
  });
});
