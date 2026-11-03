# Release notes and packaging

## Version history

- `package.json` is the source of the current app version; the sidebar displays the shipped version.
- For each published version, create a matching Git tag (`vMAJOR.MINOR.PATCH`) and GitHub Release with a concise user-facing change list. Git commits retain detailed development history; releases mark supported distribution points.
- Keep `HANDOVER.md`'s Version history section aligned with every app-version change. The app can later add an About / What's New view that presents curated release notes; it should not try to reproduce the full Git commit graph.
- Do not bump the version for every implementation task. Bump for a deliberate release or distribution milestone and document it.

## Phase 0 local builds

- Web/PWA: `npm run build`; publish the contents of `dist/` to an HTTPS static host when ready.
- Windows installer: `npm run electron:dist` on Windows. Output is written to `release/`.
- Unpacked desktop app: `npm run electron:pack`.

## Before public distribution

- Choose a publisher identity and acquire code-signing credentials; keep secrets outside the repository and CI logs.
- Review Electron and dependency updates, license notices, CSP, preload APIs, installer metadata, icons, and vulnerability reports.
- Define update channel and rollback policy; automatic updates are not configured in Phase 0.
- Confirm privacy statement and jurisdiction-specific ID-photo disclaimers before those features ship.
- Build reproducibly on a clean runner and verify installer/uninstaller behavior.
