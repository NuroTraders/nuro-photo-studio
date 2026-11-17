# License inventory

## Project-authored work

- Project source and documentation: MIT License (see repository `LICENSE`).
- Creator portrait `www/public/nasirpintu.jpg`: supplied by the project owner for creator attribution in this application.
- Fonts: system fonts only; no font files or remote font fetches.
- Editing icons and controls: native/project-authored markup and SVG; no icon package is bundled.
- Image operations: native Canvas 2D and browser Blob APIs; no third-party image editing/export library is bundled.

## Build and desktop toolchain

These are development/packaging dependencies, not runtime image-processing dependencies. Each retains its own MIT license; package versions and transitive dependencies are recorded in `package-lock.json`.

- Vite
- Electron
- Electron Builder
- Concurrently
- cross-env
- wait-on

No React or Lucide package is included. AI collaboration credits are attribution, not runtime dependencies or a claim that those providers process user images. Any future model weights, datasets, logos, photos or other third-party assets require independent license review before inclusion.
