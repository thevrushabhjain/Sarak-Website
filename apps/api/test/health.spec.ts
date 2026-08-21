import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

describe("GET /healthz", () => {
  it("returns ok", async () => {
    const res = await SELF.fetch("https://example.com/healthz");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
