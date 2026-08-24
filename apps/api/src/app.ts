import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { contentAdminRoutes } from "./routes/content-admin";
import { usersAdminRoutes } from "./routes/users-admin";
import { contentRoutes } from "./routes/content";
import { mediaRoutes } from "./routes/media";

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SARAK_BOOTSTRAP_TOKEN?: string;
};

export function createApp(_env: Bindings) {
  const app = new Hono<{ Bindings: Bindings }>();
  app.get("/healthz", (c) => c.json({ ok: true }));
  app.route("/admin/auth", authRoutes());
  // GET is intentionally unguarded on both mounts; POST /admin/media is
  // session-gated (the /media POST shares the same guard).
  app.route("/admin/media", mediaRoutes());
  app.route("/admin/content", contentAdminRoutes());
  app.route("/media", mediaRoutes());
  app.route("/admin/users", usersAdminRoutes());
  app.route("/api", contentRoutes());
  return app;
}
