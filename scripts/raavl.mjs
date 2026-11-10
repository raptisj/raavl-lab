import {
  readFile,
  writeFile,
  mkdir,
  cp,
  readdir,
  rename,
  realpath,
  mkdtemp,
} from "node:fs/promises";
import { existsSync, watch } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { generate } from "../packages/fixtures/generate.mjs";
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lab = resolve(root, ".lab"),
  apps = [
    "vanilla-js",
    "vanilla-ts",
    "react",
    "react-redux",
    "react-zustand",
    "next-app-router",
  ];
const [command, ...args] = process.argv.slice(2);
const json = async (p) => JSON.parse(await readFile(p, "utf8"));
const save = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
function run(cmd, args, cwd = root, capture = false) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (r.status !== 0)
    throw Error(
      `${cmd} ${args.join(" ")} failed (${r.status}): ${r.stderr || ""}`,
    );
  return r.stdout?.trim();
}
const git = (cwd, ...args) => {
  try {
    return run("git", args, cwd, true);
  } catch {
    return null;
  }
};
async function templateFingerprint() {
  const hash = createHash("sha256");
  for (const app of apps)
    hash.update(
      JSON.stringify(
        await json(resolve(root, "apps", app, "package.template.json")),
      ),
    );
  return hash.digest("hex");
}
async function publishIdentity(dir, report) {
  const { mode, version, hash, commit, dirty, selectedAt } = report;
  for (const app of apps)
    await save(resolve(dir, "apps", app, "public/lab-source.json"), {
      mode,
      version,
      hash,
      commit,
      dirty,
      selectedAt,
    });
}
async function sync(dir) {
  for (const a of apps) {
    const dest = resolve(dir, "apps", a);
    await cp(resolve(root, "apps", a), dest, { recursive: true });
    await generate(resolve(dest, "public/fixtures"));
  }
  if (existsSync(resolve(dir, "source.json")))
    await publishIdentity(dir, await json(resolve(dir, "source.json")));
  await cp(resolve(root, "packages"), resolve(dir, "packages"), {
    recursive: true,
  });
}
async function use(mode, input) {
  if (mode === "restore") {
    if (!/^[a-f0-9]{20}(?:-[a-f0-9]{8})?$/.test(input || ""))
      throw Error("Expected a run ID from .lab/runs");
    const dir = resolve(lab, "runs", input);
    await json(resolve(dir, "source.json"));
    if (!existsSync(resolve(dir, "pnpm-lock.yaml")))
      throw Error("Run has no preserved lockfile");
    for (const app of apps)
      if (!existsSync(resolve(dir, "apps", app, "node_modules/raavl")))
        throw Error("Run is not installed");
    await save(resolve(lab, "selection.tmp"), { id: input });
    await rename(resolve(lab, "selection.tmp"), resolve(lab, "selection.json"));
    console.log("Restored", input);
    return;
  }
  if (!["local", "tarball", "npm"].includes(mode) || !input)
    throw Error(
      "Usage: pnpm lab:use local <checkout> | tarball <archive> | npm <exact-version>",
    );
  await mkdir(lab, { recursive: true });
  const stage = await mkdtemp(resolve(lab, "stage-"));
  let archive,
    meta = { mode };
  if (mode === "local") {
    const checkout = await realpath(resolve(input));
    if (root === checkout || root.startsWith(checkout + "/"))
      throw Error("Move the lab outside the library first.");
    const pkg = await json(resolve(checkout, "package.json"));
    if (pkg.name !== "raavl" || !pkg.exports?.["./core"])
      throw Error("Not a Raavl checkout");
    meta = {
      ...meta,
      checkout,
      commit: git(checkout, "rev-parse", "HEAD"),
      dirty: !!git(checkout, "status", "--porcelain"),
    };
    run("npm", ["run", "build"], checkout);
    const packed = JSON.parse(
      run(
        "npm",
        ["pack", "--ignore-scripts", "--json", "--pack-destination", stage],
        checkout,
        true,
      ),
    );
    archive = resolve(stage, packed[0].filename);
  } else if (mode === "tarball") archive = await realpath(resolve(input));
  else {
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(input))
      throw Error("npm mode requires an exact version");
    const registry = JSON.parse(
      run("npm", ["view", `raavl@${input}`, "--json"], root, true),
    );
    if (
      registry.name !== "raavl" ||
      registry.version !== input ||
      !registry.exports?.["./react"] ||
      !registry.exports?.["./regions"]
    )
      throw Error(
        "Registry identity/export verification failed; refusing unrelated package",
      );
    meta.registry = { version: input, integrity: registry.dist?.integrity };
    const packed = JSON.parse(
      run(
        "npm",
        [
          "pack",
          `raavl@${input}`,
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          stage,
        ],
        root,
        true,
      ),
    );
    archive = resolve(stage, packed[0].filename);
  }
  const files = run("tar", ["-tzf", archive], root, true).split("\n");
  if (files.some((p) => p.startsWith("/") || p.split("/").includes("..")))
    throw Error("Unsafe archive paths");
  const pkg = JSON.parse(
    run("tar", ["-xOf", archive, "package/package.json"], root, true),
  );
  if (pkg.name !== "raavl") throw Error("Expected package name raavl");
  const expected = [
    ".",
    "./core",
    "./dom",
    "./react",
    "./regions",
    "./timeline",
    "./minimap",
    "./history",
    "./snapping",
    "./themes",
    "./styles.css",
    "./themes.json",
  ];
  for (const e of expected) {
    const entry = pkg.exports?.[e];
    if (!entry) throw Error(`Missing export ${e}`);
    for (const target of typeof entry === "string"
      ? [entry]
      : Object.values(entry)) {
      if (
        typeof target !== "string" ||
        !files.includes("package/" + target.replace(/^\.\//, ""))
      )
        throw Error(`Missing packed export target ${target}`);
    }
  }
  if (
    !pkg.peerDependenciesMeta?.react?.optional ||
    !pkg.peerDependenciesMeta?.["react-dom"]?.optional
  )
    throw Error("Expected optional React peers");
  const hash = createHash("sha256")
    .update(await readFile(archive))
    .digest("hex");
  const templateHash = await templateFingerprint();
  const id = hash.slice(0, 20) + "-" + templateHash.slice(0, 8),
    dir = resolve(lab, "runs", id);
  await mkdir(resolve(dir, "artifacts"), { recursive: true });
  await cp(archive, resolve(dir, "artifacts", `${hash}.tgz`));
  await sync(dir);
  await writeFile(
    resolve(dir, "pnpm-workspace.yaml"),
    "packages:\n  - apps/*\n  - packages/*\n",
  );
  await writeFile(resolve(dir, ".npmrc"), "auto-install-peers=false\n");
  await save(resolve(dir, "package.json"), {
    private: true,
    packageManager: "pnpm@9.5.0",
  });
  for (const a of apps) {
    const p = await json(resolve(dir, "apps", a, "package.template.json"));
    p.dependencies.raavl = `file:../../artifacts/${hash}.tgz`;
    await save(resolve(dir, "apps", a, "package.json"), p);
  }
  run(
    "pnpm",
    [
      "install",
      existsSync(resolve(dir, "pnpm-lock.yaml"))
        ? "--frozen-lockfile"
        : "--no-frozen-lockfile",
    ],
    dir,
  );
  const report = {
    ...meta,
    id,
    hash,
    templateHash,
    version: pkg.version,
    labRevision: git(root, "rev-parse", "HEAD"),
    selectedAt: new Date().toISOString(),
  };
  await save(resolve(dir, "source.json"), report);
  await mkdir(resolve(lab, "selections"), { recursive: true });
  await save(resolve(lab, "selections", `${Date.now()}-${id}.json`), report);
  await publishIdentity(dir, report);
  await save(resolve(lab, "selection.tmp"), { id });
  await rename(resolve(lab, "selection.tmp"), resolve(lab, "selection.json"));
  console.log("Selected", report);
}
async function active() {
  if (!existsSync(resolve(lab, "selection.json")))
    throw Error(
      "No source selected. Run pnpm lab:use local ../raavl or tarball <path>.",
    );
  const { id } = await json(resolve(lab, "selection.json"));
  const dir = resolve(lab, "runs", id);
  console.log("Source:", await json(resolve(dir, "source.json")));
  return dir;
}
try {
  if (command === "use") await use(...args);
  else {
    const dir = await active();
    if (command === "status") {
      if (existsSync(resolve(lab, "last-failure.json")))
        console.log(
          "Last failure:",
          await json(resolve(lab, "last-failure.json")),
        );
      process.exit(0);
    }
    const selected = await json(resolve(dir, "source.json"));
    if (
      selected.templateHash &&
      selected.templateHash !== (await templateFingerprint())
    )
      throw Error(
        "App manifests changed. Rerun lab:use to install a matching run.",
      );
    await sync(dir);
    if (args[0] && !args[0].startsWith("--") && !apps.includes(args[0]))
      throw Error("Unknown app: " + args[0]);
    const chosen = args.find((a) => apps.includes(a));
    const targets = chosen ? [chosen] : apps;
    if (command === "dev") {
      if (!chosen) throw Error("Choose app: " + apps.join(", "));
      const port = 4301 + apps.indexOf(chosen);
      const child = spawn(
        "pnpm",
        ["--filter", `@lab/${chosen}`, "dev", "--port", String(port)],
        { cwd: dir, stdio: "inherit" },
      );
      let timer;
      const watcher = watch(
        resolve(root, "apps", chosen),
        { recursive: true },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => sync(dir).catch(console.error), 150);
        },
      );
      child.on("exit", (c) => {
        watcher.close();
        process.exit(c ?? 1);
      });
    } else {
      const build = () => {
        for (const a of targets)
          run("pnpm", ["--filter", `@lab/${a}`, "build"], dir);
      };
      const types = () => {
        for (const a of targets)
          run("pnpm", ["--filter", `@lab/${a}`, "typecheck"], dir);
      };
      const tests = () => {
        process.env.LAB_APP = chosen || "";
        if (command === "devtest") process.env.LAB_DEV = "1";
        const grep = args.indexOf("--grep");
        return run(
          "pnpm",
          [
            "exec",
            "playwright",
            "test",
            ...(args.includes("--matrix")
              ? []
              : [
                  "--project=" +
                    (args
                      .find((a) => a.startsWith("--browser="))
                      ?.split("=")[1] || "chromium"),
                ]),
            ...(grep >= 0
              ? ["--grep", args[grep + 1]]
              : chosen
                ? ["--grep", "\\b" + chosen + " "]
                : []),
          ],
          root,
        );
      };
      if (command === "build") build();
      else if (command === "typecheck") types();
      else if (command === "test" || command === "devtest") tests();
      else if (command === "package")
        run("node", ["tests/packaging/check.mjs", dir]);
      else if (command === "check") {
        types();
        build();
        run("node", ["tests/packaging/check.mjs", dir]);
        tests();
      } else throw Error("Unknown command " + command);
    }
  }
} catch (e) {
  await mkdir(lab, { recursive: true });
  await save(resolve(lab, "last-failure.json"), {
    command,
    args,
    error: e.message,
    at: new Date().toISOString(),
  });
  console.error(e.message);
  process.exitCode = 1;
}
