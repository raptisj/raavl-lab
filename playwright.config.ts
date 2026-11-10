import { defineConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const { id } = JSON.parse(readFileSync(".lab/selection.json", "utf8"));
const dir = resolve(".lab/runs", id);
const apps = [
  "vanilla-js",
  "vanilla-ts",
  "react",
  "react-redux",
  "react-zustand",
  "next-app-router",
];
export default defineConfig({
  metadata: {
    source: JSON.parse(readFileSync(resolve(dir, "source.json"), "utf8")),
    mode: process.env.LAB_DEV ? "development" : "production",
  },
  testDir: "tests/browser",
  timeout: 30000,
  workers: 2,
  reporter: [
    ["list"],
    ["json", { outputFile: `.lab/reports/browser-${Date.now()}.json` }],
  ],
  use: { trace: "retain-on-failure" },
  projects: ["chromium", "firefox", "webkit"].map((browserName) => ({
    name: browserName,
    use: { browserName: browserName as "chromium" | "firefox" | "webkit" },
  })),
  webServer: [
    {
      command: "node scripts/fixture-server.mjs",
      url: "http://127.0.0.1:4390/health",
      reuseExistingServer: false,
    },
    ...apps
      .map((a, i) => ({ a, i }))
      .filter(({ a }) => !process.env.LAB_APP || a === process.env.LAB_APP)
      .map(({ a, i }) => ({
        command: `pnpm --filter @lab/${a} ${process.env.LAB_DEV ? "dev" : "start"} --port ${4301 + i}`,
        cwd: dir,
        url: `http://127.0.0.1:${4301 + i}`,
        reuseExistingServer: false,
        timeout: 60000,
      })),
  ],
});
