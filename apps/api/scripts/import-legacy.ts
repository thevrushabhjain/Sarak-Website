import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
// Repo-root legacy module (single-package Next.js app still lives at repo root,
// three levels above apps/api/scripts/).
import { activities, programs, gallery, images } from "../../../lib/data";

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const lines: string[] = [];
for (const [i, a] of activities.entries()) {
  lines.push(
    `INSERT OR REPLACE INTO activities (id,slug,title,tag,image_url,description,status,sort) VALUES (${q("act-" + a.slug)},${q(a.slug)},${q(a.title)},${q(a.tag)},${q(a.image)},${q(a.description)},'published',${i});`,
  );
}
for (const [i, p] of programs.entries()) {
  const deadline = p.deadline ?? "";
  lines.push(
    `INSERT OR REPLACE INTO programs (id,slug,title,image_url,description,open,deadline_text,status,sort) VALUES (${q("prg-" + p.slug)},${q(p.slug)},${q(p.title)},${q(p.image)},${q(p.description)},${p.state === "open" ? 1 : 0},${q(deadline)},'published',${i});`,
  );
}

const seedsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations", "seeds");
mkdirSync(seedsDir, { recursive: true });
writeFileSync(join(seedsDir, "0003_legacy.sql"), lines.join("\n") + "\n");

console.log(
  `source: activities=${activities.length} programs=${programs.length} | inserted: activities=${activities.length} programs=${programs.length} rows=${lines.length} | deferred (not imported): gallery=${gallery.length} images=${Object.keys(images).length}`,
);
