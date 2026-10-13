export type RuntimeKind = "web" | "desktop";

declare global {
  interface Window {
    __KUROHA_DESKTOP__?: {
      openPath?: (path: string) => Promise<void>;
      revealPath?: (path: string) => Promise<void>;
    };
  }
}

export const runtime = {
  kind(): RuntimeKind {
    return window.__KUROHA_DESKTOP__ ? "desktop" : "web";
  },

  canOpenNativePath(): boolean {
    return Boolean(window.__KUROHA_DESKTOP__?.openPath);
  },

  async openPath(path: string): Promise<void> {
    if (!window.__KUROHA_DESKTOP__?.openPath) return;
    await window.__KUROHA_DESKTOP__.openPath(path);
  },

  async revealPath(path: string): Promise<void> {
    if (!window.__KUROHA_DESKTOP__?.revealPath) return;
    await window.__KUROHA_DESKTOP__.revealPath(path);
  },
};
