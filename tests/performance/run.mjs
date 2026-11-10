import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
const { id } = JSON.parse(await readFile(".lab/selection.json", "utf8"));
const dir = resolve(".lab/runs", id);
const servers = ["vanilla-js", "react"].map((app, i) =>
  spawn(
    "pnpm",
    ["--filter", `@lab/${app}`, "start", "--port", String(4351 + i)],
    { cwd: dir, stdio: "ignore", detached: true },
  ),
);
let browser;
try {
  for (const port of [4351, 4352])
    for (let n = 0; ; n++) {
      try {
        await fetch(`http://127.0.0.1:${port}`);
        break;
      } catch {
        if (n === 100) throw Error("Server failed");
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  await page.goto("http://127.0.0.1:4351/?scenario=scale");
  await expect(page.locator("#wave canvas")).toHaveCount(2);
  const redraw = [];
  for (const mode of ["zoom", "fit", "hidden"]) {
    await page
      .getByRole("button", { name: "Measure " + mode, exact: true })
      .click();
    await expect(page.locator("#events")).toContainText(
      '"mode":"' + mode + '"',
      { timeout: 60000 },
    );
    redraw.push(JSON.parse(await page.locator("#events").textContent()));
  }
  await page.goto("http://127.0.0.1:4352/?scenario=many");
  await expect(
    page.getByRole("button", { name: "Play audio", exact: true }),
  ).toHaveCount(12);
  const many = { players: 12, dom: await page.locator("*").count() };
  await page
    .getByRole("button", { name: "Play audio", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Pause audio", exact: true }),
  ).toHaveCount(1);
  await writeFile(
    ".lab/performance-report.json",
    JSON.stringify(
      {
        id,
        at: new Date().toISOString(),
        browser: browser.version(),
        platform: process.platform,
        arch: process.arch,
        viewport: { width: 1280, height: 900 },
        redraw,
        many,
        limitations:
          "Redraw includes requestAnimationFrame. Local baseline only; no universal thresholds or heap-reclamation claim.",
      },
      null,
      2,
    ),
  );
  console.log({ redraw, many });
} finally {
  await browser?.close();
  for (const s of servers)
    try {
      process.kill(-s.pid, "SIGTERM");
    } catch {}
}
