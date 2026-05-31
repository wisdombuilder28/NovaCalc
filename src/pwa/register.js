// Service worker registration + PWA install prompt handler.
export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes('id-preview--') ||
    host.includes('lovableproject.com') ||
    (host.includes('lovable.app') && host.startsWith('id-preview--'));

  if (inIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });

  // Catch the install prompt and show it immediately
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    if (document.getElementById('nc-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'nc-install-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #6ee7ff;
      color: #000;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 9999;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      cursor: pointer;
      white-space: nowrap;
    `;
    banner.innerHTML = `
      <span>📲 Install NovaCalc</span>
      <button id="nc-install-btn" style="background:#000;color:#6ee7ff;border:none;padding:6px 14px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer;">Install</button>
      <button id="nc-install-close" style="background:none;border:none;font-size:18px;cursor:pointer;color:#000;line-height:1;">×</button>
    `;
    document.body.appendChild(banner);

    document.getElementById('nc-install-btn').addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.remove();
    });

    document.getElementById('nc-install-close').addEventListener('click', () => {
      banner.remove();
    });
  }

  // Remove banner once app is installed
  window.addEventListener('appinstalled', () => {
    const banner = document.getElementById('nc-install-banner');
    if (banner) banner.remove();
  });
}