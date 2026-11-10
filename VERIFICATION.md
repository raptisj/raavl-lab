# Executed verification

Date: **2026-11-10**. Host: macOS arm64, Node **22.22.3**, pnpm **9.5.0**.

The lab was confirmed to be a sibling of the library checkout, outside its Git root. `git -C ../raavl status --porcelain` was empty before and after implementation. Only the library's locked dependencies and generated build outputs were created; no tracked library files changed.

## Package identity

- Raavl **0.0.0**, private/unreleased checkout.
- Library commit: `810506245b1974bb1314791cc6bef705c33afc8a`; clean tracked state.
- Archive SHA256: `e526631b30181cc5712a3a8d24ea9e7fbb34db3a8fc9a52ebe950ef2bacd8ef1`.
- Final active run: `e526631b30181cc5712a-db3c264e` (tarball mode, consuming the locally built artifact).
- Local and tarball modes both exercised. Rebuilding the unchanged library reproduced the same archive hash.
- No lab Git revision exists yet; reports correctly record `null`. No Git remote or repository was created.

## Commands and results

| Actual command | Result |
| --- | --- |
| `pnpm install` / fresh `pnpm install --frozen-lockfile` | Root bootstrap passed without a Raavl registry dependency |
| `npm --prefix ../raavl ci --ignore-scripts` | Library's existing locked build dependencies installed |
| `pnpm lab:use local ../raavl` | Existing library build and pack passed; public exports inspected; six consumers installed |
| `pnpm lab:use tarball <archive>` | Passed, including a path containing spaces and a separate fresh lab without a library checkout |
| `pnpm test:sources` | Missing paths, invalid archives and floating npm versions rejected; active selection retained; valid spaced-path tarball installed |
| `pnpm test:bootstrap` | Fresh temporary root install, no-source diagnostic, tarball-only installation and vanilla production build passed |
| `pnpm lab:typecheck` | All six app consumers passed |
| `pnpm lab:build` | All five Vite builds and Next production build passed |
| `pnpm lab:check` | **Passed end to end:** type checks, all builds, isolated package suite and **24/24 Chromium tests** |
| `pnpm lab:test --browser=webkit` | **24/24 WebKit tests passed** against the final app builds |
| `pnpm lab:test --matrix` | Matrix attempted; Firefox failed before tests because its browser could not open its profile folder. Earlier Chromium/WebKit test-assertion issues were corrected and their final suites rerun successfully |
| `pnpm test:package` | npm and pnpm clean no-React imports, builds, declarations and optional-module bundle boundaries passed; React 18/19 SSR and bundler declaration checks passed; NodeNext issue reported separately as blocked |
| `pnpm test:compat` | Separate React **18.3.1** and **19.3.1** development consumers passed real playback, borrowed ownership, repeated Strict Mode remounts and complete-player smoke checks |
| `pnpm test:dev` | Eight React development scenario checks passed (before the additional controlled-state test was added; that test passed in both final production engines) |
| `node scripts/raavl.mjs devtest next-app-router` | Next development direct-load/hydration/navigation check passed after explicit loopback origin configuration |
| `pnpm test:performance` | Dense supplied-peak and twelve-player measurements recorded; see below |
| `npm view raavl --json` | **E404**; no verified release available for successful npm-mode installation |

Playwright **1.65.0**, Chromium **158.0.8127.18**, Playwright WebKit **27.2**. Firefox revision **1572** was downloaded but could not launch; the startup problem also reproduced using `/private/tmp`. This is not a browser compatibility pass.

The final browser suite covers native playback/time progression, seeks/settings/range playback, data replacement, errors and cancellation, File/borrowed-media input, owned/borrowed lifecycle, React components and composition, controlled local/Redux/Zustand revisions, persistence, external edits during gestures, locks, history, selection, theme changes, minimap keyboard navigation, touch-emulated seeking, and Next SSR/navigation. Native media creation is observed in the Next test without replacing media behavior: two playing owners become one on route navigation.

## Local performance baseline

Measured with Chromium 158 on macOS arm64, viewport **1280×900**, DPR **1**, one warm-up and **30 samples per mode**. The fixture has two hours of supplied stereo peaks and **10,000 regions**. Times include `requestAnimationFrame`, update, drawing and browser scheduling. No portable thresholds are asserted.

| Mode | Median | p95 | DOM elements | Visible region overlays |
| --- | ---: | ---: | ---: | ---: |
| 100 pixels/second | 16.7 ms | 39.9 ms | 437 | 16 |
| Fit, all annotations | 16.7 ms | 26.6 ms | 60,338 | 10,000 |
| Fit, annotations hidden | 16.7 ms | 17.5 ms | 138 | 0 |

The independent-player baseline mounted **12 players**, counted **133 DOM elements**, and verified starting one player leaves the other eleven paused. An exploratory alternating fit/zoom run incurred much larger transition costs; these steady-mode samples do not establish cheap zoom transitions. Measurements were taken before the final Next-only manifest change and the vanilla controlled-editor history refinement; they use the same Raavl archive and scale implementation.

## Coverage accounting and remaining gaps

`coverage.json` contains **42 entries**: **29 verified**, **9 implemented with incomplete subcase assertions**, **2 blocked**, and **2 manual-unverified**. All entries reference existing source/test files. `verified` describes the linked assertions, not universal coverage of every feature combination.

The nine partially verified groups are vanilla headless, the full source-input matrix, the full error matrix, region/marker variants, custom label lifecycle, timeline details, snapping targets, appearance variants, and viewport/follow/resize variants. Their runnable actions are implemented and their expected behavior is recorded; not every subcase has a dedicated automated assertion.

Remaining explicit blockers and manual checks:

1. **NodeNext declarations:** shipped extensionless declaration re-exports fail clean NodeNext ESM consumers. Bundler consumers and SSR JavaScript imports pass. Minimal reproduction and proposed library fix are in KNOWN_ISSUES.md. The library was not patched.
2. **npm release:** registry E404 blocks a successful exact-release installation. Version and identity validation are implemented; no fallback is used.
3. **Firefox:** browser startup fails before application tests; the project remains enabled and fails visibly.
4. **Manual:** real Safari/iOS, Android, screen readers, native autoplay/background policies, extended label/channel interaction, React commit/drag profiling and heap reclamation are unverified. Follow MANUAL_TESTS.md.

Raw browser runs are saved under `.lab/reports/` with artifact identity and development/production mode. Package reports and lockfiles live in each generated run. Bootstrap, source-selection, React compatibility and performance reports live in `.lab/`. These local artifacts are intentionally ignored by Git.

No recording, spectrogram, live-stream, mixing, destructive editing, or sample-accurate scheduling support is claimed. The complete device/environment matrix remains incomplete even though the runnable six-app lab and its core check pass.
