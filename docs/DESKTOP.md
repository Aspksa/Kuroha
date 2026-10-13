# Desktop shell boundary

Kuroha remains a web + local API platform for now. No desktop runtime is required.

The web layer exposes a narrow adapter in web/src/platform/runtime.ts. A future shell may inject window.__KUROHA_DESKTOP__ with openPath(path) and revealPath(path) functions.

Pages should use that adapter instead of importing a desktop-specific SDK directly. This keeps the same React application usable in browser, PWA and a future Tauri-style shell.
