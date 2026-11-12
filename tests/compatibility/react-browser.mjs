import {
  mkdtemp,
  readFile,
  writeFile,
  cp,
  readdir,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { generate } from "../../packages/fixtures/generate.mjs";
const { id } = JSON.parse(await readFile(".lab/selection.json", "utf8"));
const artifacts = resolve(".lab/runs", id, "artifacts"),
  archive = resolve(artifacts, (await readdir(artifacts))[0]);
const results = [];
for (const [i, version] of ["18.3.1", "19.3.1"].entries()) {
  const workspace = await mkdtemp(resolve(tmpdir(), "raavl-react-browser-"));
  const dir = resolve(workspace, "apps/react");
  await cp("pnpm-workspace.yaml", resolve(workspace, "pnpm-workspace.yaml"));
  await cp("apps/react", dir, { recursive: true });
  await cp("packages/fixtures", resolve(workspace, "packages/fixtures"), {
    recursive: true,
  });
  await generate(resolve(dir, "public/fixtures"));
  const manifest = JSON.parse(
    await readFile(resolve(dir, "package.template.json"), "utf8"),
  );
  manifest.dependencies = {
    raavl: "file:" + archive,
    react: version,
    "react-dom": version,
  };
  manifest.devDependencies["@types/react"] = version.startsWith("18")
    ? "18.3.12"
    : "19.3.0";
  manifest.devDependencies["@types/react-dom"] = version.startsWith("18")
    ? "18.3.1"
    : "19.3.0";
  await writeFile(resolve(dir, "package.json"), JSON.stringify(manifest));
  const install = spawnSync("npm", ["install", "--ignore-scripts"], {
    cwd: dir,
    stdio: "inherit",
  });
  if (install.status !== 0) throw Error("Install failed");
  const port = 4318 + i;
  const server = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: dir,
    stdio: "ignore",
    detached: true,
  });
  let browser;
  try {
    for (let n = 0; ; n++) {
      try {
        await fetch(`http://127.0.0.1:${port}`);
        break;
      } catch {
        if (n === 100) throw Error("Dev server failed");
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    browser = await chromium.launch();
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${port}/?scenario=borrowed`);
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await expect
      .poll(async () => Number(await page.getByTestId("clock").textContent()))
      .toBeGreaterThan(0.1);
    await page.getByRole("button", { name: "Toggle borrowed view" }).click();
    await expect(page.locator("section pre")).toContainText("playing");
    for (let n = 0; n < 3; n++) {
      await page.getByRole("button", { name: "Mount / unmount owner" }).click();
      await expect(page.getByTestId("clock")).toHaveCount(0);
      await page.getByRole("button", { name: "Mount / unmount owner" }).click();
      await expect(page.getByTestId("clock")).toHaveCount(1);
    }
    await page.goto(`http://127.0.0.1:${port}/?scenario=complete`);
    await page.getByRole("button", { name: "Play audio", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Pause audio", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    results.push({
      version,
      mode: "development StrictMode",
      browser: browser.version(),
      status: "passed",
    });
  } finally {
    await browser?.close();
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
}
await writeFile(
  ".lab/react-browser-report.json",
  JSON.stringify({ id, results }, null, 2),
);
console.log(results);
