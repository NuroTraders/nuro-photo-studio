# Architecture

## Layers

1. UI: navigation, controls, preview and status. It delegates image operations.
2. Application core: app state, documents, history, settings and job queue.
3. Image engine: decoding, Canvas rendering, crop/transform, adjustment, resize and export.
4. AI engine (later): ONNX initialization, provider selection, optional models and task modules.
5. Platform: browser/PWA and Electron integration, storage, file access and printing.

The browser and Electron share `www/`. Electron's renderer behaves like a browser page; privileged operations belong in the main process behind narrow preload APIs. Phase 0 exposes only version/platform metadata.

## Data direction

UI events → core command/state → editor or processing module → preview/export result. Later AI jobs use a worker and explicit model manager. Retain original source data and represent edits as working state/operations so undo, comparison and export do not destroy the source.

## Offline behavior

The service worker caches the small application shell and same-origin static assets as they are requested, with a network-first navigation fallback. The Pages workflow explicitly copies `www/sw.js` to `dist/sw.js`, because Vite does not publish that unreferenced source file automatically. It does not cache blobs, imported images, or models. Browser PWA requires localhost or HTTPS. Electron packages the built shell locally; it does not depend on a remote web origin.

## Security boundaries

- Renderer: `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`, `webSecurity: true`.
- Preload: frozen `window.nuroDesktop` bridge with one typed-purpose function; no raw IPC or Node objects.
- Main: deny navigation outside expected local origin/file path, deny window creation, and open only intentional HTTPS links externally.
- CSP: same-origin scripts/styles/connect; no objects, frames, or remote code.
- Keep app shell and future model storage separate. Validate file types, image dimensions and resource limits before processing.

## Future AI rules

The model registry must include source, license, version, size, SHA-256, tensor contract, verified execution providers, and compatibility notes. Downloads require user consent and integrity verification. WebGPU must be feature-detected, WASM fallback tested, and model-specific shape/runtime constraints recorded. No model runs in Phase 0.
