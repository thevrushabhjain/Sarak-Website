import { describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";

const LOCAL = "http://localhost:8081";
const PROD = "https://sarak-admin.pages.dev";
const PREVIEW = "https://abc123def.sarak-admin.pages.dev";

async function preflight(origin: string, path: string): Promise<Response> {
  return SELF.fetch(`https://sarak-api.example.com${path}`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type",
    },
  });
}

describe("CORS preflight", () => {
  const allowedOrigins = [LOCAL, PROD, PREVIEW];
  const paths = [
    "/admin/auth/login",
    "/admin/content/collections/activities",
    "/api/collections/news",
    "/api/enquiry",
  ];

  for (const origin of allowedOrigins) {
    for (const path of paths) {
      it(`204 for ${origin} -> ${path}`, async () => {
        const res = await preflight(origin, path);
        expect(res.status).toBe(204);
        expect(res.headers.get("access-control-allow-origin")).toBe(origin);
        expect(res.headers.get("access-control-allow-credentials")).toBe("true");
        expect(res.headers.get("access-control-allow-methods")).toContain("POST");
        expect(res.headers.get("access-control-allow-headers")).toContain("content-type");
      });
    }
  }
  it("rejects unknown origins (no ACAO header)", async () => {
    // Hono sets Allow-Credentials unconditionally, but without an echoed
    // Access-Control-Allow-Origin the browser always blocks the response,
    // so ACAO absence is the enforced contract here.
    const res = await preflight("https://evil.example.com", "/admin/auth/login");
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows cookie header in preflight", async () => {
    const res = await SELF.fetch("https://sarak-api.example.com/admin/auth/me", {
      method: "OPTIONS",
      headers: {
        Origin: PROD,
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "cookie",
      },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(PROD);
    expect(res.headers.get("access-control-allow-headers")).toContain("cookie");
  });
});

describe("CORS actual responses", () => {
  it("echoes allowed origin with credentials on GET /healthz", async () => {
    const res = await SELF.fetch("https://sarak-api.example.com/healthz", {
      headers: { Origin: PROD },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(PROD);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("carries ACAO on credentialed 401 from GET /admin/auth/me", async () => {
    const res = await SELF.fetch("https://sarak-api.example.com/admin/auth/me", {
      headers: { Origin: PROD },
    });
    expect(res.status).toBe(401);
    expect(res.headers.get("access-control-allow-origin")).toBe(PROD);
    expect(res.headers.get("access-control-allow-credentials")).toBe("true");
  });

  it("omits ACAO when no Origin header is present", async () => {
    const res = await SELF.fetch("https://sarak-api.example.com/healthz");
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});
