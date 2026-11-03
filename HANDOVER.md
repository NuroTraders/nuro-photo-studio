# Nuro Photo Studio — Handover

**Current milestone:** Phase 1 — Navigation and UI Components complete
**Specification baseline:** NPS-TS-001 v1.0 (draft engineering baseline)  
**App version:** 0.1.0 (see Version history below)
**State:** Foundation scaffold; no production editing or AI behavior yet

## What is here

- Independent Vite + vanilla ES module application shell under `www/`.
- Responsive editor workspace and local image preview picker.
- PWA manifest, app icons, and conservative service worker foundation.
- Electron main/preload with context isolation, sandbox, restrictive navigation, and narrow metadata bridge.
- Electron Builder Windows NSIS configuration.
- Architecture, privacy/security, initialization, release, model-policy and Phase 0 checklist docs.
- Shared vanilla DOM components and their API guide in `www/js/ui/components.js` and `docs/UI-COMPONENTS.md`.
- Validation/build helper scripts and npm lockfile.

## Deliberate boundaries

- No relationship, source dependency, clone, or changes to `NuroTraders/bg-remover`.
- No AI runtime, model weights, inference, model download, or CDN runtime.
- No image upload or cloud service.
- Image import and project persistence are not part of the current dashboard; no recent-project records are fabricated.
- Signing, updates, analytics, persistence, ID compliance presets and production image algorithms are deferred.

## Collaboration rules

1. Include GitHub commit and push commands in each final implementation report. Do not commit or push unless the user explicitly asks.
2. Record every application version in the Version history section below. Whenever `package.json` version changes, add a matching dated note to `HANDOVER.md` with the version and user-visible changes; do not silently bump the version.
3. Keep this handover current after each task so another model or contributor can resume without relying on chat history. Include current milestone, completed work, constraints, validation results and next action.

## Version history

- **0.1.0 (current; checked 2026-11-03)** — Phase 0 starter version, retained through Phase 1 Tasks 1–4. No release version bump has been made for these implementation tasks. The app sidebar displays this version; Git commits preserve task-level source history. A public GitHub Release/tag has not been recorded here.

## Phase 1 task plan

Completed:

1. **Design system:** centralized dark-first CSS tokens and shared UI styles, with a coordinated light theme available via `data-theme="light"` on the root element. Existing Phase 0 shell retained and restyled; no new dependencies or AI/image-processing behavior added.
2. **Application layout:** responsive branded sidebar, grouped navigation for all seven planned areas, active screen state, header actions, theme switch, and a keyboard-accessible mobile navigation drawer. Navigation data is maintained separately from rendering logic in `www/js/navigation.js`.
3. **Home dashboard:** reusable dashboard renderer with a welcome panel, editor action, four quick actions, empty recent-project state, feature shortcuts, and privacy tip. Upcoming actions are labeled and non-interactive; no import behavior or project data is added.
4. **Navigation and UI components:** added accessible vanilla DOM factories for buttons, icon buttons, cards, badges, native dialogs, keyboard dropdowns, timed toasts, form inputs, empty states, and loading indicators. Dashboard controls reuse the shared factories. API usage is documented in `docs/UI-COMPONENTS.md`.

Next action: define the image document model, keeping the original source separate from working state. Follow the current phase plan and do not add image importing until its scheduled phase.

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
- Phase 1 Task 4: added reusable UI component factories and API documentation; dashboard cards, buttons, badges and empty state now use shared components. `npm run check`, changed-module syntax checks, and `git diff --check` pass. Browser interaction/console review remains pending.
