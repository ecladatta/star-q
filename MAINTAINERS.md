# Maintainer Guide

## Releases

Releases require the `GITHUB_TOKEN` environment variable (a fine-grained personal access token with `contents: write` permission). Create one [here](https://github.com/settings/personal-access-tokens/new), then export it before releasing:

```bash
export GITHUB_TOKEN=your_token
```

Preview the release notes without publishing:
```bash
pnpm release:dry
```

Create a release (bumps the version, updates `CHANGELOG.md`, creates tag `vX.Y.Z`, and creates a GitHub release):
```bash
pnpm release:patch   # 0.2.0 → 0.2.1
pnpm release:minor   # 0.2.0 → 0.3.0
pnpm release:major   # 0.2.0 → 1.0.0
pnpm release         # auto-detect the bump from conventional commits
```
