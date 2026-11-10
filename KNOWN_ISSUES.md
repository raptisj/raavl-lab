# Known issues and validation limits

## Shipped NodeNext declarations (library defect)

Artifact: Raavl `0.0.0`, SHA256 `e526631b30181cc5712a3a8d24ea9e7fbb34db3a8fc9a52ebe950ef2bacd8ef1`, library commit `810506245b1974bb1314791cc6bef705c33afc8a`.

In a clean consumer with the packed artifact, React, React DOM, TypeScript and their type packages installed, create:

```tsx
import type { Source } from 'raavl/core';
import { AudioPlayer } from 'raavl/react';
const source: Source = { kind: 'url', id: 'test', url: '/tone.wav' };
const player = <AudioPlayer source={source} />;
```

Run:

```sh
npm exec -- tsc --noEmit --skipLibCheck --jsx react-jsx --module nodenext --target es2022 consumer.tsx
```

Observed: TS2305 says `Source` and `AudioPlayer` are not exported. Shipped declaration re-exports use extensionless relative specifiers, which do not resolve in NodeNext ESM. The library needs NodeNext-compatible declaration paths (for example `.js` relative specifiers) or an equivalent declaration build fix. No library files were changed. `pnpm test:package` preserves this diagnosis in its report and prints `BLOCKED`; it separately verifies the lab's intended `moduleResolution: bundler` consumers. SSR JavaScript imports and rendering pass with React 18 and 19.

## Registry release unavailable

`npm view raavl --json` returned E404 on 2026-11-10. Exact-version mode is implemented with package identity/export validation; successful public-release installation cannot be verified until a matching release exists. No fallback registry package or floating version is used.

## Firefox startup on this machine

Playwright 1.65.0 downloaded Firefox revision 1572, but the process exits before opening a page with `Could not find profile folder`. Reproduced with both the default OS temporary directory and `/private/tmp`. The full Firefox matrix remains enabled and fails visibly; this is not a claimed Firefox pass. Chromium and Playwright WebKit are separate automated environments, not device certification.

## Validation boundaries

- Real Safari/iOS, Android, screen readers, background playback, and platform autoplay policy require the checklist in MANUAL_TESTS.md.
- Performance baselines include browser scheduling, DOM layout and redraw. They do not establish universal thresholds, memory reclamation, decode memory ceilings, or sample-accurate audio scheduling.
- Source snapshots are immutable package artifacts; authored app files are intentionally synchronized into runs. Reproducing an older lab implementation also requires its original authored sources, not only the package tarball and generated lockfile.
- Automatic watch/repack of the library is not implemented. Rerun `lab:use local` after library changes.
