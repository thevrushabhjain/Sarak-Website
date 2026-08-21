import { Hono } from "hono";

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SARAK_BOOTSTRAP_TOKEN?: string;
};

export function createApp(_env: Bindings) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.get("/healthz", (c) => c.json({ ok: true }));
  return app;
}
