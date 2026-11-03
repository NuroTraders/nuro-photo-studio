# Release notes and packaging

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
