# Current implementation handoff

The lab is implemented in this independent folder. Do not restart from the original planning-only assumption.

Read AGENTS.md for boundaries, README.md for operation, coverage.json for scenario-level status, VERIFICATION.md for executed checks, and KNOWN_ISSUES.md for blockers. IMPLEMENTATION_PLAN.md and COVERAGE.md remain the agreed specifications.

Authored applications live under apps/. Their package.template.json files are materialized into ignored .lab/runs after source selection. Root installation does not require Raavl. The current local machine's source selection and artifacts are intentionally untracked. Start with `pnpm lab:status`; on a fresh copy, select a local checkout or supplied tarball.

The library was built and packed using its existing commands. Its tracked files were not modified. Do not fix the documented NodeNext declaration defect without separate authorization. No hosting, CI, remote repository, global link, or library source alias was added.

Continue from explicit verification gaps rather than claiming device or Firefox certification. Existing public API examples and regression assertions should be retained when refining the lab.
