import { Hono } from "hono";
import { authRoutes } from "./routes/auth";
import { contentAdminRoutes } from "./routes/content-admin";
import { usersAdminRoutes } from "./routes/users-admin";
import { formsAdminRoutes } from "./routes/forms-admin";
import { mediaRoutes } from "./routes/media";
import { contentRoutes } from "./routes/content";
import { submissionsPublicRoutes } from "./routes/submissions-public";

export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  SARAK_BOOTSTRAP_TOKEN?: string;
  // Cloudflare Turnstile server secret; when absent the public submission
  // endpoints skip bot verification entirely (dev/test default).
  TURNSTILE_SECRET?: string;
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
  app.route("/admin/forms", formsAdminRoutes());
  app.route("/api", contentRoutes());
  app.route("/api", submissionsPublicRoutes());
  return app;
}
