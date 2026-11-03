# Nuro Photo Studio — Handover

**Current milestone:** Phase 1 — Home Dashboard complete  
**Specification baseline:** NPS-TS-001 v1.0 (draft engineering baseline)  
**State:** Foundation scaffold; no production editing or AI behavior yet

## What is here

- Independent Vite + vanilla ES module application shell under `www/`.
- Responsive editor workspace and local image preview picker.
- PWA manifest, app icons, and conservative service worker foundation.
- Electron main/preload with context isolation, sandbox, restrictive navigation, and narrow metadata bridge.
- Electron Builder Windows NSIS configuration.
- Architecture, privacy/security, initialization, release, model-policy and Phase 0 checklist docs.
- Validation/build helper scripts and npm lockfile.

## Deliberate boundaries

- No relationship, source dependency, clone, or changes to `NuroTraders/bg-remover`.
- No AI runtime, model weights, inference, model download, or CDN runtime.
- No image upload or cloud service.
- Image import and project persistence are not part of the current dashboard; no recent-project records are fabricated.
- Signing, updates, analytics, persistence, ID compliance presets and production image algorithms are deferred.

## Next action: Phase 0 completion

1. Install Node.js 20.19+ or 22.12+ and run `npm install`.
2. Run `npm run check`, `npm run build`, and `npm run electron:pack` on Windows.
3. Manually verify PWA offline behavior and Electron security boundaries using `docs/PHASE-0-CHECKLIST.md`.
4. Record platform/version results and any defects here before declaring Phase 0 accepted.

## Phase 1 task plan

Completed:

1. **Design system:** centralized dark-first CSS tokens and shared UI styles, with a coordinated light theme available via `data-theme="light"` on the root element. Existing Phase 0 shell retained and restyled; no new dependencies or AI/image-processing behavior added.
2. **Application layout:** responsive branded sidebar, grouped navigation for all seven planned areas, active screen state, header actions, theme switch, and a keyboard-accessible mobile navigation drawer. Navigation data is maintained separately from rendering logic in `www/js/navigation.js`.
3. **Home dashboard:** reusable dashboard renderer with a welcome panel, editor action, four quick actions, empty recent-project state, feature shortcuts, and privacy tip. Upcoming actions are labeled and non-interactive; no import behavior or project data is added.

Next action: continue Phase 1 with image document architecture, without AI:

1. Define an image document that retains the original source and separates working state.
2. Add validated import for JPG/JPEG, PNG and WebP; report unsupported files and size limits.
3. Implement canvas viewport, fit/zoom/pan, rotation, crop and undo/redo through isolated engine modules.
4. Add before/after comparison and safe export to PNG/JPEG/WebP without overwriting source.
5. Add preview-resolution rendering and full-resolution export path; test large-image memory failures.
6. Add interaction and integration checks for browser and Electron.

Keep UI components thin. Image algorithms belong in `editor/` or `processing/`, not in DOM event handlers. Preserve local-only processing and do not begin model integration until its own phase has approved model/license/runtime details.

## Decisions and open items

- Vite provides dev/build only; no frontend framework.
- Electron loads the same `www/` application served locally in development and from packaged files in production.
- Browser image preview uses an object URL and releases the previous URL on replacement/page teardown.
- Model registry schema and download policy belong to a later phase; `www/models/manifest.json` is intentionally empty.
- Before ID presets are implemented, identify official source material per jurisdiction and track verification dates.

## Update log

- Phase 0: initial project skeleton authored from the referenced v1.0 specification and proposal context.
- PWA Pages follow-up: use the explicit project-site start URL and scope, publish the service worker with the Vite build, and keep precache entries aligned with production output.
- Phase 1 Task 1: established dark-default design tokens, reusable controls and shell component styles, visible keyboard focus, and a token-coordinated light theme. Checked with `npm run check` and `npm run build`.
