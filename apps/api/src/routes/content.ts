import { Hono } from "hono";
import type { Bindings } from "../app";

const COLLECTIONS: Record<string, string> = {
  activities: "SELECT id,slug,title,tag,image_url,description FROM activities",
  programs: "SELECT id,slug,title,image_url,description,open,deadline_text FROM programs",
  news: "SELECT id,slug,title,image_url,excerpt,published_at FROM news",
};

export function contentRoutes() {
  const app = new Hono<{ Bindings: Bindings }>();

  app.get("/collections/:name", async (c) => {
    const base = COLLECTIONS[c.req.param("name")];
    if (!base) return c.json({ error: "unknown_collection" }, 404);
    const { results } = await c.env.DB.prepare(
      `${base} WHERE status='published' ORDER BY sort ASC, created_at DESC`,
    ).all();
    c.header("cache-control", "public, s-maxage=30");
    return c.json(results);
  });

  return app;
}
