# Raavl local integration lab

Six independent consumers of the **installed public Raavl package**. This is a local workspace, with no hosting, deployment, CI, remote repository, source aliases, vendored internals, or global links. The sibling library remains unchanged.

## Start

Use Node **22.22.3** and pnpm **9.5.0**. Install that pnpm version with your preferred package-manager setup; the root `packageManager` field pins it.

```sh
pnpm install --frozen-lockfile
# Root installation needs no Raavl package and works before source selection.

# Use your own checkout path; ../raavl is only the sibling example.
# The library's own locked build dependencies must already be installed:
npm --prefix ../raavl ci --ignore-scripts
pnpm lab:use local ../raavl

# Or start without any library checkout:
pnpm lab:use tarball '/path with spaces/raavl.tgz'

pnpm lab:status
pnpm lab:dev vanilla-js
```

| App | Local port | Source and scenarios |
| --- | --- | --- |
| Vanilla JavaScript | 4301 | `apps/vanilla-js/src/main.js`: editor, headless, data, sources, failures, ownership, controlled, scale |
| Vanilla TypeScript | 4302 | `apps/vanilla-ts/src/main.ts`: independent typed implementation against shipped declarations |
| React 19 | 4303 | `apps/react/src/main.tsx`: complete, composed, headless, owned, borrowed, multiple, independent, modules, controlled, many |
| Redux Toolkit | 4304 | `apps/react-redux/src/`: serializable state, compare-and-set revisions, persistence, accepted history |
| Zustand | 4305 | `apps/react-zustand/src/`: equivalent store integration with explicit lifecycle owners |
| Next App Router | 4306 | `apps/next-app-router/app/`: server shell, route-local player, persistent layout player, `/away` navigation |

Select scenarios with the app links or `?scenario=headless`. The vanilla pages expose explicit API actions; the scenarios change ownership/preparation rather than substituting placeholder screens. Open a second terminal with `pnpm fixtures:serve` for the vanilla network/decode/CORS/slow-source actions (port **4390**). Normal local audio does not need this server.

## Source selection and reproduction

```sh
pnpm lab:use local <checkout>
pnpm lab:use tarball <archive>
pnpm lab:use npm <exact-version>
pnpm lab:use restore <existing-run-id>
pnpm lab:status
```

`local` validates the checkout, invokes **only** its `npm run build`, then packs with lifecycle scripts disabled. `tarball` requires no library checkout. `npm` accepts an exact semver, verifies name/version/public exports, then packs and validates it through the same artifact path. The registry returned E404 for Raavl on 2026-11-10; successful release-mode verification is **blocked**, not silently replaced by another package.

The root workspace contains only tooling and private fixture/test packages. Authored apps use `package.template.json`, without an unpublished Raavl dependency. Selection materializes private apps under ignored `.lab/runs/<archive-hash>-<manifest-hash>/`, using relative `file:` tarball dependencies. Each app declares its own dependencies. Optional React peers are not auto-installed. Archive bytes are SHA256-addressed even when every library build is version `0.0.0`.

Exports, their files, CSS/JSON and optional peers are inspected before installation. A run retains its lockfile; repeat installs use it frozen. Selection changes atomically only after successful installation. Failures retain the active selection and are recorded in `.lab/last-failure.json`. `lab:status` displays active identity and the most recent failure, even if historical. Selection history is retained in `.lab/selections/`. Every app displays version, source mode and hash; full provenance includes local commit/dirty state and lab revision when available.

The CLI synchronizes authored app sources before commands, and watches the chosen app during `lab:dev`; edit `apps/`, never generated runs. Manifest changes require `lab:use` again. Shared audio is generated and copied into every app's `public/fixtures`, so production Next and Vite use the same deterministic stereo WAV. Fixture edits require restarting `lab:dev`. Library artifacts are snapshots: rerun `lab:use local` to pick up a library change. Restore a prior run to switch package/lockfile; retain the corresponding authored source revision to reproduce an older lab implementation.

## Checks

```sh
pnpm browsers:install             # separate Chromium / Firefox / WebKit download
pnpm lab:typecheck               # all app consumers
pnpm lab:build                   # all production apps, including Next build
pnpm lab:test                    # Chromium production suite; requires builds
pnpm lab:test --browser=webkit
pnpm test:matrix                 # all three engines; Firefox currently blocked here
pnpm test:package                # clean npm/pnpm installs, exports, bundles, TS, SSR
pnpm test:compat                 # separate React 18/19 development Strict Mode browsers
pnpm test:bootstrap              # clean root install + tarball-only build
pnpm test:sources                # invalid inputs, rollback, tarball path with spaces
pnpm test:dev                    # React development browser checks
pnpm test:performance            # separate heavy dense-waveform/many-player baseline
pnpm lab:check                   # typecheck + production builds + package checks + Chromium

pnpm lab:build react
pnpm lab:typecheck vanilla-ts
pnpm lab:test vanilla-js --grep 'modules, keyboard'
```

Production browser servers start only selected apps (all six if no app filter), reject occupied ports and terminate after tests. Do not run suites sharing these ports concurrently. `lab:dev <app>` starts only that app. Missing browsers produce Playwright's installation diagnostic; use `pnpm browsers:install`. Traces and logs are retained on failures. Test reports are in `.lab/`, with package reports and lockfiles in the selected run. The optional HTTP fixture server uses actual responses and actual browser media, including separate waveform-fetch failures; media playback is not mocked.

`lab:check` verifies the intended bundler consumers. It prints a separate blocked NodeNext-declaration diagnosis; it does **not** claim all compatibility environments pass. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md), [coverage.json](coverage.json) and [VERIFICATION.md](VERIFICATION.md) for actual results.

## Integration contracts

- App stores own serializable source descriptors, documents, revisions, selection, preferences and accepted history. Players, media, File/Blob objects and DOM nodes stay in lifecycle owners. Playback clock subscriptions are leaf components and never dispatch each frame through Redux/Zustand.
- A proposal is accepted only at its matching `baseRevision`; the document and next revision publish atomically. External edits and stale proposals are explicit controls. Persistence uses validated, source-bound JSON. Storage effects occur outside reducers.
- A borrowed view never owns the player. `usePlayer` or the vanilla lifecycle owns disposal. A borrowed media element remains under its external owner's control after player disposal; page teardown separately releases the lab-owned demonstration element.
- Next uses normal SSR and marked client integrations, with no blanket SSR disabling. React 18 is tested separately, never forced into Next's dependency tree.
- Optional modules share the existing view/player and dispose before the view. Data-only views use supplied peaks; headless scenarios omit waveform preparation and the Raavl stylesheet.
- `packages/test-utils` shares browser assertions and observation of real native media allocation. It does not wrap or hide example integrations.

Tool requirements were checked against npm package metadata and the primary [Vite requirements](https://vite.dev/guide/), [Next installation guidance](https://nextjs.org/docs/app/getting-started/installation), and [pnpm workspace documentation](https://pnpm.io/workspaces). Pinned versions are in the manifests and lockfiles.

Real Safari/iOS, Android, screen-reader certification, autoplay/background policies and extended memory/render profiling remain manual: [MANUAL_TESTS.md](MANUAL_TESTS.md). Recording, spectrograms, live streams, sample-accurate scheduling, mixing and destructive editing are unsupported library features, not missing demo promises.
