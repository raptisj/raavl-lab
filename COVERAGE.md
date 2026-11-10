# Coverage specification

This is the initial implementation checklist, not a claim of completed coverage. Reconcile it with the actual library exports and PRODUCT.md before building scenarios.

## Coverage manifest

Create `coverage.json` during implementation. Each entry should include a stable ID, feature group, app, scenario path, public entry points, ownership mode where relevant, automated test path or manual instructions, expected behavior, and status (`planned`, `implemented`, `verified`, `blocked`, or `manual-unverified`). Record supported framework/browser configurations separately from test results. Reports should identify the actual package artifact/version used.

Run each feature in at least one canonical app. Run framework-neutral high-risk ownership and annotation behavior in vanilla and React. Do not duplicate every test across all six apps merely to inflate coverage.

| Group | Required scenarios | Key assertions |
| --- | --- | --- |
| Complete React player | AudioPlayer defaults, optional controls, custom slots/layout options supported by current types | Controls operate, callbacks/errors work, cleanup occurs |
| Individual components | PlayerRoot, PlayPauseButton, TimeDisplay, SeekSlider, MuteButton, VolumeSlider, PlaybackRateSelect, LoopButton, PlayerStatus, custom context-based control | Root ownership, disabled/pending state, native attributes, supported event overrides |
| Headless | Vanilla createPlayer; React usePlayer, state/time hooks; no waveform preparation or stylesheet | Playback works without view/decode; hooks clean up |
| Waveform-only | Data-only DOM view, supplied immutable peaks, replacement data | No audio allocation; data updates render correctly |
| Ownership | Owned source, borrowed player, borrowed media, multiple views, independent players, remounts | Unmounting a view preserves borrowed player; owner teardown releases owned resources; borrowed media disposal contract preserved |
| Navigation | Next route-local player and persistent layout-owned player | Correct stop/persist behavior; no hydration warnings or stale subscriptions |
| Source inputs | URL, File, Blob, borrowed HTMLMediaElement; source ID/revision | Proper readiness, matching data, source replacement; borrowed media requires explicit peaks/none |
| Waveform preparation | Decode, supplied peaks, none; mono and multichannel | Preparation/playback readiness independent; no decode when disabled |
| Playback | Play/pause, seek/fraction, volume/mute, rate, full loop, range playback/loop | Observable commands work; tolerate best-effort media scheduling |
| Lifecycle | Clear, abort, rapid replacement, dispose, repeated disposal, Strict Mode | Stale work cannot replace active source; no unhandled promise errors or duplicate live resources |
| Errors | Bad media, network failure, decode failure, invalid/mismatched peaks, autoplay rejection where reproducible | Expected error code/stage; waveform failure can coexist with playback; cancellation handled |
| Regions/markers | Add/update/delete, drag/move/resize, labels, locks, metadata, channel-specific regions | Valid committed data, locked behavior, bounds and channel behavior |
| Selection | Drag range, create region from selection where API supports it, select annotation, clear selection | Selection and seek behavior stay distinct; callbacks agree with UI |
| Annotation ownership | Internal store, borrowed store, React defaults, controlled document/revision | Exactly one ownership mode; committed state matches owner |
| Controlled concurrency | Accept/reject proposals, external revision during gesture, stale baseRevision | Atomic revision checks, rejected geometry restores, stale gestures do not overwrite state |
| Persistence | Validated JSON import/export, local persistence reload, source-bound documents | Round trip preserves data; invalid data reported; mismatched source behavior correct |
| Rules | Minimum/maximum length, grid snapping, invalid/out-of-bounds items | Constraints enforced according to current API; no silent unsupported clamping |
| Custom labels | DOM label lifecycle and React labels | Correct rendering/cleanup; durable editor state stays outside ephemeral labels |
| Timeline | Independent timeline plus waveform | Ticks follow viewport/zoom; dispose resources |
| Minimap | Player-backed and data-only where supported; pointer/keyboard navigation | Viewport changes without seeking audio; no extra audio decode |
| History | Undo/redo, source reset, new edit clears redo, controlled commit acceptance | Only accepted edits recorded; document restore respects revision/validation |
| Snapping | Markers, boundaries, grid, playhead, custom targets | Pointer snapping honors tolerance/constraints; keyboard behavior remains appropriate |
| Module composition | Timeline + minimap + history + snapping editor | Shared view/player, correct disposal order, no duplicate resource ownership |
| Appearance | Line/bars, sizing, amplitude/normalization, channels, presets, JSON themes, CSS/custom labels | Visual changes preserve playback and refresh canvas as required |
| Viewport | Fit/numeric zoom, scroll, follow modes, resize, viewport subscriptions | Correct bounds/snapshots, no unexpected seek, dispose notification |
| State integrations | React local state, Redux Toolkit, Zustand | Real store-driven edits/persistence, serializable state, isolated playback clock |
| Accessibility/input | Keyboard seek/edit, focus, labels, accessible lists/sliders, pointer/touch | Observable keyboard behavior; manual screen-reader status explicit |
| Scale | Long supplied peaks, dense regions, zoom versus fit, many independent players | Record reproducible metrics; no invented universal thresholds |
| Package integrity | Every export, CSS/JSON, declarations, clean vanilla install, SSR imports, React peers | Installed artifact works without source aliases or accidental workspace dependencies |

## Environment matrix

- Vite vanilla JS with no React installed in a clean consumer.
- Vite vanilla TS compiling against packaged declarations.
- React 18 and React 19 in separate compatible consumers; core lifecycle/component smoke checks in each.
- Redux Toolkit and Zustand with selected documented compatible versions.
- Next App Router development and production build/start; select a supported React version for that Next release.
- Chromium, Firefox, and WebKit automated core checks; broader feature matrix exposed as an explicit command.
- npm and pnpm clean artifact installation checks.
- Actual Safari/iOS, Android, and screen-reader use: manual, unverified until performed.

Choose and document a Node version supported by all pinned tools. Add another Node version only if the declared support policy requires it; do not confuse a library engine range with proof that every lab framework runs on its minimum.

## Explicit exclusions

Current product documentation does not implement recording, spectrograms, infinite/live streams, sample-accurate range scheduling, Web Audio playback backend, multitrack mixing, destructive audio editing, collaboration, or framework-specific Vue/Svelte adapters. Do not add fictional examples for these.

Pages Router, other bundlers/frameworks, Yarn/Bun, Electron, and comprehensive device certification are possible later additions, not initial completion criteria.

## Implementation record

The checklist above is the specification. Current scenario mappings and individual verification states are in [coverage.json](coverage.json). Executed commands and environment results are recorded in [VERIFICATION.md](VERIFICATION.md); [KNOWN_ISSUES.md](KNOWN_ISSUES.md) distinguishes blocked compatibility checks from supported examples. An `implemented` entry is deliberately not a claim that every subcase has an automated assertion.
