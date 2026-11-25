import { useEffect, useState } from 'react';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [message, setMessage] = useState('');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine);
    const offered = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    const complete = () => {
      setInstall(null);
      setInstalled(true);
    };
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    window.addEventListener('beforeinstallprompt', offered);
    window.addEventListener('appinstalled', complete);

    const workerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_BLOCKED_OPEN_TABS') {
        setMessage('Close other MyMomentOclock tabs or windows before updating, then choose Reload to update again.');
      }
    };
    navigator.serviceWorker?.addEventListener('message', workerMessage);

    let alive = true;
    if (import.meta.env.PROD && window.isSecureContext && 'serviceWorker' in navigator) {
      const root = new URL(import.meta.env.BASE_URL, document.baseURI);
      navigator.serviceWorker
        .register(new URL('sw.js', root), { scope: root.pathname, updateViaCache: 'none' })
        .then((registration) => {
          if (!alive) return;
          const observe = () => {
            if (alive) {
              setWaiting(
                registration.active &&
                  navigator.serviceWorker.controller &&
                  registration.waiting?.state === 'installed'
                  ? registration.waiting
                  : null
              );
            }
          };
          observe();
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', observe);
          });
        })
        .catch(() => {
          if (alive) setMessage('Offline service worker registration unavailable; client-edge calculations remain active.');
        });
    }

    return () => {
      alive = false;
      navigator.serviceWorker?.removeEventListener('message', workerMessage);
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      window.removeEventListener('beforeinstallprompt', offered);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  const applyUpdate = () => {
    if (!waiting || waiting.state !== 'installed' || !window.confirm('Reload to apply the latest app update?')) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    waiting.postMessage({ type: 'APPLY_SHELL_UPDATE' });
  };

  const offerInstall = async () => {
    if (!install) return;
    const prompt = install;
    setInstall(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === 'accepted'
          ? 'Install request accepted. Your browser completes installation.'
          : 'Installation dismissed. You can continue using this browser.'
      );
    } catch {
      setMessage('Installation is unavailable here. You can continue using this browser.');
    }
  };

  return (
    <aside aria-label="App availability and installation" className="border-t border-rose-950 bg-[#120307] px-4 py-4 text-xs text-rose-200/90">
      <div className="mx-auto max-w-7xl space-y-2">
        <p role="status" aria-live="polite">
          {online
            ? '🟢 Client-Edge Astronomical Engine Active — 100% of Panchanga, Muhurta, Choghadiya, Hora & Personal Synastry calculations execute locally on your device.'
            : '🟡 Offline Mode Active — All 165+ catalog cities, solar Kaalas, Choghadiyas, Horas, and personal Tara/Chandra Bala calculations continue working 100% offline.'}
        </p>
        {waiting && (
          <div className="space-y-2">
            <p role="status">An app update is ready.</p>
            <button type="button" className="rounded border border-amber-400 px-3 py-1.5 text-amber-200" onClick={applyUpdate}>
              Reload to update
            </button>
          </div>
        )}
        {install && (
          <button type="button" className="rounded border border-amber-400 px-3 py-1.5 text-amber-200" onClick={offerInstall}>
            Install MyMomentOclock App
          </button>
        )}
        {installed && <p role="status">Your browser reported that the app was installed.</p>}
        {message && <p role="status">{message}</p>}
        <details>
          <summary className="cursor-pointer py-1 text-rose-300 hover:text-amber-200">
            Install &amp; Offline Privacy Information
          </summary>
          <p className="mt-1 max-w-3xl text-rose-300/80 leading-relaxed">
            MyMomentOclock computes topocentric solar sunrise/sunset, 5-Limb Panchanga, and natal synastry locally in your browser. Personal profile data is never transmitted to any external AI server and is stored locally only when you explicitly save a profile.
          </p>
        </details>
      </div>
    </aside>
  );
}
