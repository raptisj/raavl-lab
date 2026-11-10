# Implementation plan

## 1. Objective and decisions

Create a separate local workspace that serves two purposes: copyable examples of public Raavl integrations, and executable checks that Raavl works as an installed dependency in independent consumers.

Use pnpm workspaces with a small number of apps and multiple scenarios per app. Do not create a separate application for every feature, and do not attempt the full Cartesian product of every feature, browser, framework, and version. Each supported feature needs coverage; each environment needs smoke coverage; high-risk combinations need explicit tests.

No hosting, deployment setup, public gallery, backend service, or CI is required. A local test fixture server is allowed where HTTP behavior needs testing. Next.js is included for its runtime boundaries, SSR/hydration, and navigation behavior, not for deployment.

## 2. Evidence from the existing library

Revalidate these facts against the supplied checkout before implementation. This inventory was inspected on 2026-11-10; it is not a substitute for current exported types.

- Package name `raavl`; private, version `0.0.0`; typed ESM exports.
- Existing build: `npm run build`, using Vite plus TypeScript declaration generation.
- Existing checks: `npm run check`; unit tests stay in the library.
- React and React DOM are optional peers supporting React 18 and 19.
- Public exports: `raavl`, `raavl/core`, `raavl/dom`, `raavl/react`, `raavl/styles.css`, `raavl/themes`, `raavl/themes.json`, `raavl/regions`, `raavl/timeline`, `raavl/minimap`, `raavl/history`, `raavl/snapping`.
- JavaScript exports point to `dist/library`; declarations point to `dist/types`. CSS and theme JSON ship from `src`, through public exports. Importing those public subpaths is valid; importing arbitrary source files is not.
- Existing docs/examples import library source and therefore do not prove package integrity.
- Useful references: `PRODUCT.md`, `package.json`, `src/core/types.ts`, `src/react/`, `docs/content/docs/`, `tests/`, `examples/live/`, and `scripts/generate-fixtures.mjs`.
- `docs/design/` and `examples/workflows.js` contain historical sketches; do not treat them as the implemented API.

Keep the original library package manager. The lab can use pnpm independently.

## 3. Workspace layout

```text
apps/
  vanilla-js/          # Vite, genuine JS integration, no React
  vanilla-ts/          # Vite, typed consumer
  react/              # Vite, components/hooks/features
  react-redux/        # Redux Toolkit, controlled annotations
  react-zustand/      # Zustand, controlled annotations
  next-app-router/    # Next SSR/client boundary and navigation
packages/
  fixtures/           # Small audio, peak data, annotation documents
  test-utils/         # Browser assertions and test helpers
scripts/
  raavl.mjs           # Package selection and orchestration
tests/
  packaging/          # Artifact inspection and isolated consumers
  compatibility/     # React versions, import/type checks
  browser/           # Cross-app browser projects/specifications
.lab/                 # Ignored source metadata, artifacts, generated runs
coverage.json
pnpm-workspace.yaml
package.json
pnpm-lock.yaml
README.md
```

Assign documented stable ports, detect collisions, and start only requested apps. Production test servers must have predictable startup/teardown. Avoid introducing a dashboard application just to list links; a README and terminal listing are enough.

Use shared fixtures via a documented copy/serve mechanism that works in Vite and Next development and production. Share little or no demo UI: users should see the actual Raavl calls in each app. Explain and document shared test utilities.

## 4. Dependency selection and reproducibility

### Required modes

1. `local <path>`: validate the checkout, run its existing build, pack it, and install the archive into consumers.
2. `tarball <path>`: inspect and install an existing archive; no library source checkout required.
3. `npm <exact-version>`: verify package identity and resolve/install that exact release. Do not silently use `latest` or a floating range.

All apps retain the same source imports regardless of mode. Fail clearly when no source is selected; never fall back to an unrelated registry package or a previously selected version.

### Bootstrap requirement

The initial root install must work even when no Raavl release exists. Implement and document a concrete solution before adding the full app matrix.

Recommended design: keep authored app sources/manifests as templates and materialize a runnable workspace under ignored `.lab/runs/<source-id>/`, with generated manifests using the selected exact version or tarball. A small root tooling workspace can install without Raavl. Generate or copy app sources for each run, and provide source synchronization during development so edits to authored files appear in the active app. Preserve a generated run's lockfile and source identity for reproduction. Do not let generated files become the only editable application source.

An alternative design is acceptable if it is simpler and demonstrably satisfies all of these requirements: fresh installation without npm Raavl, no committed absolute local paths, no silent dirty tracked manifests/lockfiles, consistent resolution across apps, reproducible runs, and reliable local source editing. Document the chosen mechanism and its tradeoffs. Do not assume an environment variable alone changes pnpm dependency resolution.

### Artifact handling

- Prefer built tarballs over source aliases or global links for correctness.
- Inspect package name, export map, expected files, and declared peers.
- Use content-hashed archive names; repeated version `0.0.0` must not cause stale cache reuse.
- Record source mode, version, archive hash, library commit when available, dirty status, and lab revision in a run report.
- Build only the library, not its documentation app.
- Do not change library version/private flags just to pack locally.
- Use staging/temporary output and atomic selection changes where practical. If install fails, retain the previous working selection and report the failure.
- Test paths containing spaces and missing/invalid input paths.
- Keep archives, reports, recordings, generated runs, and local configuration ignored by Git.

### Command contract

Implement `lab:use`, `lab:status`, `lab:dev <app>`, `lab:build`, `lab:typecheck`, `lab:test`, and `lab:check`. Allow app/scenario filters. `lab:check` runs the documented core validation suite. Document browser installation separately and provide clear missing-browser diagnostics.

### Optional fast watch mode, after artifact mode works

Local artifact mode is a snapshot, not live reload of the library. Initially, rerunning `lab:use local` refreshes it. A later `lab:watch <path>` can watch/rebuild/repack/reinstall with debouncing and restart consumers as needed. Alternatively use a tested file-based package workflow. Watch both JS and declarations; wait for complete builds, avoid rebuild loops, and verify React resolves to the consumer's instance. Avoid promises of instant HMR across Next and Vite without testing it.

No need to add watch scripts to the library for the initial release of the lab.

## 5. Application requirements

### vanilla-js and vanilla-ts

Provide playback, custom controls, headless mode, data-only rendering, source variants, lifecycle cleanup, annotation editing, themes, and optional modules. The JS app must contain genuine JavaScript integration code. The TS app must exercise public declarations without source path aliases. Validate at least one consumer outside the workspace with no React installed.

### react

Provide focused scenarios for `AudioPlayer`, `PlayerRoot` with every individual control, `usePlayer` with custom UI, `Waveform` with an owned source, a borrowed player, multiple views, multiple independent players, and controlled/default/borrowed annotations. Include Strict Mode mounting/unmounting, labels, error callbacks, themes, and optional module composition.

Keep clock subscriptions in small leaf components; document ownership and disposal. Never pass both `source` and `player` where mutually exclusive. SSR imports and initial rendering must not allocate browser resources.

### Redux Toolkit and Zustand

Implement real store integrations, not apps that merely install the package. Store serializable annotation documents, revisions, selection/preferences, and appropriate source descriptors. Keep Player objects, DOM nodes, Files/Blobs, and audio resources out of persisted/serializable global state. Keep runtime resources in a lifecycle owner.

Accept annotation proposals only when `baseRevision` matches current state; atomically publish the accepted document and next revision. Demonstrate stale proposal rejection, external edits, persistence reload, source changes, and history containing accepted commits only. Avoid dispatching each playback frame through the application store. Explain which state belongs to Raavl versus the application.

### Next.js App Router

Use a server-rendered route shell with correctly marked client integration modules. Test direct loads, production build/start, hydration without errors, navigation teardown, and an explicitly persistent player above route content. Compare component-owned playback stopping on unmount with shared playback surviving intended navigation. Do not use blanket SSR disabling to mask an import/hydration defect.

React 18/19 compatibility tests should use standalone compatible consumers; do not force an unsupported version into the selected Next release. Add Pages Router or other frameworks only when explicitly brought into the support scope.

## 6. Verification strategy

### Package integrity

- Install a packed artifact into clean consumers outside the workspace dependency tree.
- Resolve all public JS exports and check exported CSS/theme JSON files.
- Compile representative TS consumers against shipped declarations.
- Check vanilla imports work without React and optional modules are not pulled into unrelated baseline bundles.
- Check server-side imports/React rendering without browser globals, while keeping actual playback browser-only.
- Add npm and pnpm consumer smoke checks. No need for a full Yarn/Bun matrix initially.

### Browser behavior

Use Playwright with Chromium, Firefox, and WebKit projects. Run the core flow frequently; expose an explicit broader command for the full engine matrix. User gestures must initiate playback. Test actual state/time progression, seeking with tolerance, editing commits, reload/persistence, cleanup, and expected errors. Do not replace the whole media implementation with mocks in integration tests.

Serve small deterministic local audio/peaks. Use controlled HTTP routes or a fixture server for delay, cancellation, CORS, and errors. Distinguish waveform-fetch errors from native media failures. Account for engine codec differences; skipped or unsupported cases need explicit reasons. Assert observable invariants rather than fragile pixel-perfect canvas screenshots or exact wall-clock audio timing.

Use production builds for core smoke tests, especially Next hydration/navigation. Include development Strict Mode tests separately. Capture logs/traces on failure. Test keyboard and touch-emulated interactions, but do not describe emulation or Playwright WebKit as real iOS/Safari certification.

### Performance and manual validation

Generate long supplied-peak fixtures and dense annotation datasets locally. Measure redraw/interaction samples, DOM counts, many-player behavior, and React render behavior. Record environment, warm-up, sample count, and medians/p95. Treat initial results as baselines, not portable performance guarantees. Keep heavy benchmarks outside the default quick check.

Provide a short manual checklist for real Safari/iOS, Android, autoplay/background behavior, and screen-reader interaction. Mark these unverified until someone actually executes them.

## 7. Phased execution and acceptance

### Phase 1 — Foundation and vertical slice

- Establish the independent project boundary and toolchain.
- Implement bootstrap and local/tarball selection, status, and failure handling.
- Create vanilla JS, React, and Next apps with real playback.
- Build each app and run a browser smoke test against the package artifact.
- Verify an isolated no-React vanilla consumer and typed package consumer.

Exit: a fresh lab checkout can consume a supplied tarball without a library checkout, and local mode consumes newly built changes without source aliases. No changes to the library are required.

### Phase 2 — Integration patterns

- Add vanilla TS, Redux Toolkit, Zustand.
- Complete headless, composed, full-player, ownership, and navigation scenarios.
- Verify controlled revisions, persistence, stale edits, Strict Mode, and cleanup.

Exit: all six apps are runnable, integration-specific behavior is demonstrated and tested, and copyable source is easy to locate.

### Phase 3 — Feature inventory

- Implement the remaining COVERAGE.md scenarios and machine-readable manifest.
- Cover source variants, waveform modes, annotations, module composition, styling, errors, and interactions.
- Generate and serve fixtures consistently across apps.

Exit: every supported feature group maps to runnable examples and assertions or a documented manual check; no placeholder coverage claims remain.

### Phase 4 — Compatibility and polish

- Finish published-package mode, with identity validation; mark live registry validation blocked if no verified release exists.
- Add React 18/19 and npm/pnpm isolated consumers.
- Run browser matrix and production smoke checks.
- Add performance scenarios and manual device checklist.
- Implement optional fast watch only after the required source modes are reliable.
- Finalize actual command documentation, troubleshooting, source provenance, and reports.

Exit: clean bootstrap, source switching, app development, production builds, type checks, package checks, and core browser checks work locally. Gaps are explicitly reported; inability to test an unpublished npm release is not hidden.

## 8. Definition of done

- Six independent runnable apps with focused, understandable examples.
- Public package imports only; normal package behavior tested outside the workspace.
- Required source modes implemented, with tested local/tarball paths and honest registry status.
- No committed machine paths, generated caches, credentials, or large unnecessary media.
- Deterministic local fixtures; no external service required for normal examples.
- Coverage manifest links features, apps, scenarios, tests, and verification status.
- Local checks are documented and reproducible; failures identify app, scenario, and package source.
- No hosting/deployment/CI work added, no library restructuring, and no existing docs/examples removed.

## 9. Reference documentation

Verify current tool behavior and compatibility during implementation:

- https://pnpm.io/workspaces
- https://pnpm.io/symlinked-node-modules-structure
- https://pnpm.io/cli/link
- https://docs.npmjs.com/cli/v11/commands/npm-pack/
- https://playwright.dev/docs/browsers

The pinned package-manager version governs actual configuration syntax. Do not copy assumptions from a different pnpm major version.

## Execution record

The independent lab now contains all six application implementations and the generated-artifact workspace mechanism described above. See [README.md](README.md) for runnable commands and [VERIFICATION.md](VERIFICATION.md) for actual phase evidence. Registry release availability, NodeNext declarations, Firefox startup, and real-device checks retain explicit statuses; the full environment matrix is not claimed complete.
