# GitHub Actions — CI/CD Pipelines

## Workflows

| Workflow | Trigger | What it does |
|----------|---------|-------------|
| [CI](workflows/ci.yml) | Push/PR to `main` | Builds, tests (Node 18/20/22), runs coverage |
| [Validate](workflows/validate.yml) | Push/PR to `main` | Validates docs structure, spec files, all examples |
| [Docs](workflows/docs.yml) | Push to `main` (docs/) | Deploys documentation to GitHub Pages |
| [Publish](workflows/publish.yml) | Tag `v*` | Publishes to npm |
| [Release](workflows/release.yml) | Tag `v*` | Creates GitHub Release with changelog |
| [Nightly](workflows/nightly.yml) | Daily at 00:00 UTC | Runs full test suite and example validation |
| [Snapshot Check](workflows/snapshot-check.yml) | Push/PR | Verifies codegen snapshots are up-to-date |

## Secrets Required

| Secret | Used By | Description |
|--------|---------|-------------|
| `NPM_TOKEN` | publish.yml | npm automation token for publishing |
