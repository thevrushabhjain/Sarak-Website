import { Hono } from "hono";
import type { Bindings } from "../app";
import { requireSession } from "../lib/http";
import { sniffImageType } from "../lib/sniff";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MIME: Record<string, string> = {
  jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
};
const EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };

export function mediaRoutes() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.post("/", async (c) => {
    try { await requireSession(c); } catch { return c.json({ error: "unauthorized" }, 401); }

    const form = await c.req.formData();
    const file: unknown = form.get("file");
    if (!(file instanceof File)) return c.json({ error: "missing_file" }, 400);
    if (file.size > MAX_IMAGE_BYTES) return c.json({ error: "too_large" }, 413);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImageType(bytes);
    if (!kind) return c.json({ error: "unsupported_type" }, 415);

    const key = `m/${crypto.randomUUID()}.${EXT[kind]}`;
    const id = crypto.randomUUID();
    const alt = (form.get("alt") as string) ?? "";
    await c.env.MEDIA.put(key, bytes, { httpMetadata: { contentType: MIME[kind] } });
    await c.env.DB.prepare(
      "INSERT INTO media (id,key,mime,bytes,alt,created_by) VALUES (?,?,?,?,?,?)",
    ).bind(id, key, MIME[kind], bytes.byteLength, alt, null).run();

    return c.json({
      id, key, mime: MIME[kind], bytes: bytes.byteLength, url: `/media/${key}`,
    }, 201);
  });

  app.get("/:key{.+}", async (c) => {
    const obj = await c.env.MEDIA.get(c.req.param("key"));
    if (!obj) return c.text("not found", 404);
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new Response(obj.body, { headers });
  });

  return app;
}
