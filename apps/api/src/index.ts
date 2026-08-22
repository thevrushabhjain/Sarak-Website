import { createApp } from "./app";
import type { Bindings } from "./app";

export default {
  fetch: (req, env, ctx) => createApp(env).fetch(req, env, ctx),
} satisfies ExportedHandler<Bindings>;
