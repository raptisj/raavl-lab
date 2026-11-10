# Instructions for implementing raavl-lab

## Intent and scope

Build the local-only lab described in IMPLEMENTATION_PLAN.md and COVERAGE.md. The user requested a separate project for realistic consumer examples and local compatibility testing. No hosting, deployment configuration, remote repository creation, or published website is requested.

This folder was staged inside the library repository only so the user could move it. Before implementation, establish the workspace's actual location. If it is still inside the library checkout, ask the user to move it before initializing Git or installing workspace dependencies. Reading and refining these instructions is safe in the staged location.

## Boundaries

- Do not restructure or modify the Raavl library repository as part of lab setup.
- Do not remove or move its existing docs or examples.
- Do not change its package manager or publishing configuration.
- Reading the library and running its existing build/pack commands are expected.
- If a library defect blocks an example, report a minimal reproduction and the required fix. Never silently hide the defect with source imports or copied library internals.
- No submodules, vendored implementation, global npm links, or absolute paths in committed configuration.
- All example code imports public package entry points.
- Keep the lab packages private.
- Do not create a new Codex chat or remote repository unless explicitly requested.

## Implementation principles

- Pin the pnpm version and choose compatible pinned framework/tool versions after verifying their requirements.
- Use independent applications for dependency/runtime boundaries; use scenarios within apps for feature variants.
- Each app declares its own dependencies. In particular, vanilla apps must work without React installed in an isolated consumer check.
- Share fixtures and browser assertions, not abstractions that hide the integration readers need to learn.
- Preserve React 18 and React 19 compatibility as distinct test environments. Do not force incompatible React versions into the Next.js app.
- Do not advertise unsupported capabilities or unverified browser/device support.
- Use deterministic local fixtures and no required credentials or third-party media service.
- All implementation phases require working apps and meaningful local verification, not placeholder routes or screenshots alone.
- Update README.md and coverage metadata to reflect actual completed behavior. Label missing checks honestly.

## Completion reporting

Report implemented apps/scenarios, source modes tested, local verification results, actual commands, and remaining gaps. Distinguish automated browser checks, manual device checks, and unsupported features. Do not claim the lab is complete while required scenarios are placeholders.
