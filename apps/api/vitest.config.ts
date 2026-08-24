import { fileURLToPath } from "node:url";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(
    fileURLToPath(new URL("./migrations", import.meta.url)),
  );

  return {
    test: {
    // Shared D1 across spec files requires sequential execution
    fileParallelism: false,
          // One worker: strict ordering, shared-state races impossible
          singleWorker: true,
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          // Auth flows are sequential and stateful (bootstrap -> login -> recover);
          // default per-test storage isolation resets D1 between tests.
          isolatedStorage: false,
          // Tests must never share storage with the dev server or prior runs
          persistState: false,
          wrangler: { configPath: "./wrangler.test.jsonc" },
          miniflare: {
            bindings: {
              TEST_MIGRATIONS: migrations,
              SARAK_BOOTSTRAP_TOKEN: "test-bootstrap-token",
            },
          },
        },
      },
    },
  };
});
