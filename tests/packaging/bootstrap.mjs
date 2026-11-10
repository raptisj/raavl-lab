import { mkdtemp, readFile, writeFile, cp, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const { id } = JSON.parse(await readFile(".lab/selection.json", "utf8"));
const artifacts = resolve(".lab/runs", id, "artifacts");
const dir = await mkdtemp(resolve(tmpdir(), "raavl fresh lab "));
for (const name of [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  ".npmrc",
  "scripts",
  "packages",
  "apps",
])
  await cp(name, resolve(dir, name), { recursive: true });
function run(command, args) {
  const result = spawnSync(command, args, { cwd: dir, encoding: "utf8" });
  if (result.status !== 0) throw Error(result.stdout + result.stderr);
  return result.stdout;
}
run("pnpm", ["install", "--frozen-lockfile", "--ignore-scripts"]);
const absent = spawnSync("node", ["scripts/raavl.mjs", "status"], {
  cwd: dir,
  encoding: "utf8",
});
assert.notEqual(absent.status, 0);
assert.match(absent.stderr, /No source selected/);
await cp(
  resolve(artifacts, (await readdir(artifacts))[0]),
  resolve(dir, "provided package.tgz"),
);
run("node", ["scripts/raavl.mjs", "use", "tarball", "provided package.tgz"]);
run("node", ["scripts/raavl.mjs", "build", "vanilla-js"]);
await writeFile(
  ".lab/bootstrap-report.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      id,
      status: "passed",
      checks: [
        "fresh root frozen install without Raavl",
        "no-source diagnostic",
        "supplied tarball without checkout",
        "production vanilla build",
      ],
    },
    null,
    2,
  ),
);
console.log("Fresh bootstrap and tarball-only consumer passed");
