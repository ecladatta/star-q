# Maintainer Guide

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please) via the `release-please` GitHub Actions workflow. No local token or commands are required.

On every push to `main`, release-please scans conventional commits since the last release tag and opens a release PR that bumps `package.json`, updates `CHANGELOG.md`, and previews the release notes. Review and merge it like any other PR. Merging the release PR creates tag `vX.Y.Z` and a GitHub release.

To force a major bump, merge a commit marked as breaking (`BREAKING CHANGE` footer or `feat!`/`fix!` type) instead of a plain `feat`.
