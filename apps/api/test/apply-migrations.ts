import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "cloudflare:test";

declare module "cloudflare:test" {
	interface ProvidedEnv {
		TEST_MIGRATIONS: D1Migration[];
	}
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
// Deterministic slate: persistent local D1 survives across runs/files, so
// every spec starts from the same known-empty auth/content state.
for (const t of ["submission_attempts","submissions","form_versions","forms","revisions","login_attempts","sessions","recovery_codes","users","media"]) {
  await env.DB.prepare(`DELETE FROM ${t}`).run();
}
