// Service worker registration — guarded so it never runs in the Lovable preview iframe.
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes('id-preview--') ||
    host.includes('lovableproject.com') ||
    host.includes('lovable.app') && host.startsWith('id-preview--');

  if (inIframe || isPreviewHost) {
    // Clean up any stale SW from previous installs in this environment.
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
