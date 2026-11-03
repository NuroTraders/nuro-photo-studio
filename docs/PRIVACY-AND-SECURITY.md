# Privacy and security notes

Phase 0 has no server, account, telemetry, or image upload. A selected image is rendered via a temporary object URL and released when replaced or when the page closes. The PWA caches only application shell files. Electron uses a local renderer with a restricted preload bridge.

When adding file processing, validate MIME type and decode success, apply dimension/pixel/memory limits, and handle malformed inputs. Avoid logging filenames or image content. Persist files only after defining user-visible storage controls and deletion behavior. Treat model downloads as untrusted until size, source and checksum validation complete. Keep dependencies updated and review their licenses and vulnerability status before distribution.
