# Repository initialization plan

## Goal

Create a standalone Nuro Photo Studio repository that can serve one web UI as a browser/PWA app and as a Windows Electron app. Maintain the v1.0 boundaries: vanilla ES modules, modular core/editor/processing/AI/platform layers, offline-first behavior, local processing, optional AI later, and no mandatory cloud service.

## Repository creation

1. Create a new empty repository named `nuro-photo-studio` under the chosen owner.
2. Extract this archive into that repository root; do not place it in or copy source from `bg-remover`.
3. Review `.gitignore`, `package.json`, package lock and license.
4. Run the setup, check, web build, PWA manual review, Electron package and security checklist.
5. Commit the initial scaffold as a dedicated Phase 0 baseline; create CI/release workflows only after selecting the repository host and signing strategy.

## Project map

- `www/`: shared user interface, service worker, manifest, icon assets and module boundaries.
- `www/js/core/`: state, event bus, image document, history, queue and preferences.
- `www/js/editor/`: import, viewport, canvas, crop, transforms, comparison.
- `www/js/processing/`: adjustments, filters, resize, export.
- `www/js/features/`: enhancement, ID-photo, print-layout and upscaling feature modules.
- `www/js/ai/`: future runtime, provider and model-management boundaries. Empty stubs only in Phase 0.
- `www/js/workers/`: future background processing entry points.
- `electron/`: desktop main/preload/security/installer configuration.
- `scripts/`: reproducible checks and build helpers.
- `docs/`: architecture, model policy, privacy, release, phase plan and checklist.

## Dependency policy

Keep production dependencies empty in Phase 0. Vite is the dev/build tool; Electron provides desktop packaging; Electron Builder creates the Windows installer; `concurrently`, `wait-on`, and `cross-env` support local desktop development. Pin the resolved dependency graph in `package-lock.json`. Before adding any dependency, document purpose, version, maintenance, license, and bundle impact. ONNX Runtime is intentionally deferred.

## Phase gates

| Phase | Outcome | Gate |
| --- | --- | --- |
| 0 | Shell, PWA/Electron foundation, docs and security defaults | Acceptance checklist passes |
| 1 | Import, document model, canvas, crop/rotate, history, export | Local classical edit path works without AI |
| 2 | Classical adjustments and resize | Non-destructive full-resolution export verified |
| 3 | ID-photo dimensions, guides and print sheets | Authority presets have official sources and dates |
| 4 | Optional upscaler | Model/provider contracts and licenses verified; explicit download consent |
| 5 | Face detection/restoration | Identity effects disclosed; excluded from official ID workflow |
| 6 | Production release | PWA/offline, Windows packaging, recovery and release checks pass |

## Risks to resolve as implementation advances

- Browser storage quotas differ; model storage needs explicit quota and cleanup behavior.
- WebGPU support and model shapes differ by runtime/provider; use verified profiles and WASM fallback.
- Full-resolution editing can exhaust memory; use preview resolution and tiled work where appropriate.
- Country ID-photo standards and retouching rules vary and can change; cite authority, jurisdiction, and review date.
- Electron navigation and preload surface must remain narrow; add IPC only for user-visible capabilities.
- Windows signing, updater design, icon ownership, and distribution channel remain release decisions.
