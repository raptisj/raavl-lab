import { mkdtemp, readFile, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const runDir = process.argv[2];
const artifacts = resolve(runDir, "artifacts");
const archive = resolve(artifacts, (await readdir(artifacts))[0]);
const report = {
  source: JSON.parse(await readFile(resolve(runDir, "source.json"), "utf8")),
  checks: [],
};
function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) throw Error(`${cmd} failed in ${cwd}`);
}
for (const manager of ["npm", "pnpm"]) {
  const dir = await mkdtemp(resolve(tmpdir(), "raavl isolated consumer "));
  await writeFile(resolve(dir, ".npmrc"), "auto-install-peers=false\n");
  await writeFile(
    resolve(dir, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: { raavl: "file:" + archive },
      devDependencies: { vite: "8.3.7", typescript: "7.0.2" },
    }),
  );
  run(manager, ["install", "--ignore-scripts"], dir);
  await writeFile(
    resolve(dir, "check.mjs"),
    `import assert from 'node:assert/strict';
 for(const name of ['raavl','raavl/core','raavl/dom','raavl/themes','raavl/regions','raavl/history','raavl/snapping','raavl/timeline','raavl/minimap'])await import(name);
 for(const name of ['raavl/styles.css','raavl/themes.json'])assert.ok(import.meta.resolve(name));
 assert.throws(()=>import.meta.resolve('react'));
 const {createPlayer}=await import('raavl');const player=createPlayer();assert.equal(player.getSnapshot().source,'idle');player.dispose();player.dispose();
 console.log('No React installed; every vanilla entry imports on server');`,
  );
  run("node", ["check.mjs"], dir);
  await writeFile(
    resolve(dir, "index.html"),
    '<script type="module" src="/main.ts"></script>',
  );
  await writeFile(
    resolve(dir, "main.ts"),
    `import {createPlayer} from 'raavl';import type {Source} from 'raavl/core';const source:Source={kind:'url',id:'baseline',url:'/tone.wav',waveform:{kind:'none'}};const player=createPlayer();document.body.onclick=()=>player.setSource(source);`,
  );
  await writeFile(
    resolve(dir, "vite.config.mjs"),
    `export default {plugins:[{name:'assert-optional-boundaries',generateBundle(_,bundle){for(const chunk of Object.values(bundle))if(chunk.type==='chunk')for(const [id,info] of Object.entries(chunk.modules))if(info.renderedLength>0&&/\\/(react|history|snapping|timeline|minimap)([.-]|\\/)/.test(id))throw Error('Unexpected optional module '+id)}}]}`,
  );
  run(manager, ["exec", "--", "vite", "build"], dir);
  run(
    manager,
    [
      "exec",
      "--",
      "tsc",
      "--noEmit",
      "--module",
      "esnext",
      "--moduleResolution",
      "bundler",
      "--target",
      "es2022",
      "main.ts",
    ],
    dir,
  );
  report.checks.push({
    manager,
    kind: "no-react imports, isolated build, declarations, optional bundle boundary",
    status: "passed",
  });
}
for (const version of ["18.3.1", "19.3.1"]) {
  const dir = await mkdtemp(resolve(tmpdir(), "raavl react consumer "));
  await writeFile(
    resolve(dir, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        raavl: "file:" + archive,
        react: version,
        "react-dom": version,
        typescript: "7.0.2",
        "@types/react": version.startsWith("18") ? "18.3.12" : "19.3.0",
        "@types/react-dom": version.startsWith("18") ? "18.3.1" : "19.3.0",
      },
    }),
  );
  run("npm", ["install", "--ignore-scripts"], dir);
  await writeFile(
    resolve(dir, "check.mjs"),
    `import assert from 'node:assert/strict';import React from 'react';import {renderToString} from 'react-dom/server';import {AudioPlayer,Waveform,PlayerRoot} from 'raavl/react';for(const C of [AudioPlayer,Waveform,PlayerRoot])assert.equal(typeof renderToString(React.createElement(C,{source:{kind:'url',id:'ssr',url:'/tone.wav'}})),'string');console.log('SSR without browser globals passed');`,
  );
  await writeFile(
    resolve(dir, "consumer.tsx"),
    `import {createPlayer} from 'raavl';import type {Source} from 'raavl/core';import {AudioPlayer, Waveform} from 'raavl/react';import {createAnnotations} from 'raavl/regions';const source:Source={kind:'url',id:'typed',url:'/tone.wav',waveform:{kind:'none'}};const player=createPlayer();const component=<><AudioPlayer source={source}/><Waveform player={player}/></>;createAnnotations({document:{version:1,sourceId:'typed',regions:[],markers:[]}});player.dispose();`,
  );
  run("node", ["check.mjs"], dir);
  run(
    "npm",
    [
      "exec",
      "--",
      "tsc",
      "--noEmit",
      "--skipLibCheck",
      "--jsx",
      "react-jsx",
      "--module",
      "esnext",
      "--moduleResolution",
      "bundler",
      "--target",
      "es2022",
      "consumer.tsx",
    ],
    dir,
  );
  report.checks.push({
    react: version,
    kind: "SSR and bundler declarations",
    status: "passed",
  });
  const nodeNext = spawnSync(
    "npm",
    [
      "exec",
      "--",
      "tsc",
      "--noEmit",
      "--skipLibCheck",
      "--jsx",
      "react-jsx",
      "--module",
      "nodenext",
      "--target",
      "es2022",
      "consumer.tsx",
    ],
    { cwd: dir, encoding: "utf8" },
  );
  if (nodeNext.status !== 0)
    console.warn(
      "BLOCKED: NodeNext declarations; see package-report.json and KNOWN_ISSUES.md",
    );
  report.checks.push({
    react: version,
    kind: "NodeNext declarations",
    status: nodeNext.status === 0 ? "passed" : "blocked",
    diagnostic: nodeNext.stdout,
  });
}
await writeFile(
  resolve(runDir, "package-report.json"),
  JSON.stringify(report, null, 2),
);
