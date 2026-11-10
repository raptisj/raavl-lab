import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, cp, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const selection = await readFile(".lab/selection.json", "utf8");
const { id } = JSON.parse(selection);
const artifacts = resolve(".lab/runs", id, "artifacts");
const archive = resolve(artifacts, (await readdir(artifacts))[0]);
await mkdir(".lab/path with spaces", { recursive: true });
await cp(archive, ".lab/path with spaces/raavl artifact.tgz");
function use(...args) {
  return spawnSync("node", ["scripts/raavl.mjs", "use", ...args], {
    encoding: "utf8",
  });
}
for (const args of [
  ["tarball", "/missing artifact.tgz"],
  ["local", "/missing checkout"],
  ["npm", "latest"],
  ["npm", "^1.0.0"],
]) {
  const result = use(...args);
  assert.notEqual(result.status, 0);
  assert.equal(await readFile(".lab/selection.json", "utf8"), selection);
}
await writeFile(".lab/path with spaces/invalid.tgz", "invalid archive");
assert.notEqual(use("tarball", ".lab/path with spaces/invalid.tgz").status, 0);
assert.equal(await readFile(".lab/selection.json", "utf8"), selection);
const result = use("tarball", ".lab/path with spaces/raavl artifact.tgz");
if (result.status !== 0) throw Error(result.stdout + result.stderr);
assert.equal(JSON.parse(await readFile(".lab/selection.json", "utf8")).id, id);
await writeFile(
  ".lab/source-selection-report.json",
  JSON.stringify(
    {
      at: new Date().toISOString(),
      id,
      passed: [
        "missing paths retain selection",
        "floating npm versions rejected",
        "invalid archives retain selection",
        "tarball path with spaces",
      ],
      registry: "npm view raavl: E404; successful release unavailable",
    },
    null,
    2,
  ),
);
console.log("Source failure rollback and tarball path with spaces passed");
