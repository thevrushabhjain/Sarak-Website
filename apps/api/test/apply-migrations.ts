import { applyD1Migrations, env } from "cloudflare:test";
import type { D1Migration } from "cloudflare:test";

declare module "cloudflare:test" {
	interface ProvidedEnv {
		TEST_MIGRATIONS: D1Migration[];
	}
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
// Cross-run poison control: persistent local D1 keeps rate-limit/session rows
// between `pnpm test` invocations, tripping the 10-per-account window.
await env.DB.prepare("DELETE FROM login_attempts").run();
await env.DB.prepare("DELETE FROM sessions").run();
