import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import CaptchalaState, { CaptchalaAction } from '../common/states/CaptchalaState';

interface ComposerWithCaptchala {
  captchala: CaptchalaState;
  captchalaToken: string | null;
  captchalaSdk: any | null;
  captchalaHost: HTMLElement | null;
  loading: boolean;
  onsubmit: (arg?: string) => void;
}

const LOADER_URL = 'https://cdn.captcha-cdn.net/captchala-loader.js';

let loaderPromise: Promise<void> | null = null;

const shouldUseCaptcha = (): boolean =>
  !!app.forum.attribute('captchala.configured') && !!app.forum.attribute('captchala.post');

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).loadCaptchala) return Promise.resolve();
  if (loaderPromise) return loaderPromise;
  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LOADER_URL}"]`);
    const onReady = () => ((window as any).loadCaptchala ? resolve() : reject(new Error('loader missing')));
    if (existing) {
      if ((window as any).loadCaptchala) return resolve();
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('loader failed')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.src = LOADER_URL;
    s.async = true;
    s.defer = true;
    s.onload = onReady;
    s.onerror = () => {
      loaderPromise = null;
      reject(new Error('loader failed'));
    };
    document.head.appendChild(s);
  });
  return loaderPromise;
}

/**
 * Trigger a popup-mode CaptchaLa challenge on demand. Promise resolves with
 * pt_ on success, rejects on user cancel / error. The host div is hidden
 * (popup mode renders the trigger bar inline, but we don't want the bar —
 * we drive the SDK directly via showCaptcha()).
 */
async function runPopupChallenge(state: CaptchalaState, host: HTMLElement, sdk: { current: any | null }): Promise<string> {
  const serverToken = await state.ensureServerToken();
  await loadScript();
  // loader.js only exposes window.loadCaptchala; the actual SDK
  // (window.Captchala) is fetched lazily when loadCaptchala(cb) is
  // called. So don't reach for window.Captchala until INSIDE the
  // loadCaptchala callback.
  const loadCaptchala = (window as any).loadCaptchala;
  if (!loadCaptchala) throw new Error('captchala loader missing');

  return new Promise<string>((resolve, reject) => {
    loadCaptchala(() => {
      try {
        const Captchala = (window as any).Captchala;
        if (!Captchala?.init) {
          reject(new Error('captchala_unavailable'));
          return;
        }
        // The SDK's appendTo() kicks off preloadConfig() async, which
        // pre-fetches one challenge from /init. If we call showCaptcha()
        // synchronously right after, preloadedChallenge is still null
        // (preloadConfig hasn't resolved) and startVerification() fires
        // a SECOND /init. Wait for onReady — that's the signal preload
        // finished and the cached challenge is reusable.
        const inst = Captchala.init({
          appKey: state.appKey,
          serverToken,
          action: state.action,
          product: 'popup',
          lang: state.lang || undefined,
        })
          .onReady(() => {
            // preloadedChallenge is populated; showCaptcha consumes it
            // without triggering a fresh /init.
            inst.showCaptcha();
          })
          .onSuccess((res: any) => {
            const tok = (res && res.token) || '';
            state.passToken = tok;
            tok ? resolve(tok) : reject(new Error('no_token'));
          })
          .onError((err: any) => {
            // onError gets `"msg (code)"` from the SDK — see Captchala.tsx
            // for the rationale; we just need the code to decide whether
            // to drop the cached sct_ before letting the next click retry.
            const raw = typeof err === 'string' ? err : err?.message ?? String(err ?? '');
            const m = raw.match(/\(([a-z_]+)\)\s*$/);
            const code = m ? m[1] : (err?.code || err?.error || '');
            const refreshable = [
              'server_token_required',
              'server_token_invalid',
              'server_token_exhausted',
              'server_token_app_mismatch',
              'server_token_binding_mismatch',
              'token_expired',
              'server_token_expired',
              'challenge_expired',
              'session_expired',
            ];
            if (refreshable.indexOf(code) !== -1) {
              state.serverToken = null;
            }
            reject(new Error(code || raw || 'captchala_error'));
          })
          .onClose(() => {
            // User dismissed the popup before solving — treat as cancel.
            if (state.passToken === null) reject(new Error('cancelled'));
          });
        sdk.current = inst;
        state.instance = inst;
        // appendTo creates the (now hidden) trigger bar AND kicks off
        // preloadConfig — we wait for onReady before opening the popup.
        inst.appendTo(host);
        host.style.display = 'none';
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    });
  });
}

export default function extendComposer(modulePath: string, action: CaptchalaAction): void {
  extend(modulePath, 'oninit', function () {
    if (!shouldUseCaptcha()) return;

    const self = this as unknown as ComposerWithCaptchala;
    self.captchala = new CaptchalaState(action);
    self.captchalaToken = null;
    self.captchalaSdk = null;
    self.captchalaHost = null;
  });

  extend(modulePath, 'data', function (data: Record<string, unknown>) {
    if (!shouldUseCaptcha()) return;

    const self = this as unknown as ComposerWithCaptchala;
    data.captchalaToken = self.captchalaToken ?? '';
  });

  // Composer base class fires `loaded` after submission completes (including
  // on error), so we use it to invalidate the consumed pt_ token.
  extend(modulePath, 'loaded', function () {
    if (!shouldUseCaptcha()) return;

    const self = this as unknown as ComposerWithCaptchala;
    self.captchalaToken = null;
    self.captchala.serverToken = null;
    self.captchala.passToken = null;
    try {
      self.captchalaSdk?.destroy?.();
    } catch {
      /* ignore */
    }
    self.captchalaSdk = null;
  });

  override(modulePath, 'onsubmit', function (original: unknown, ...args: unknown[]) {
    const self = this as unknown as ComposerWithCaptchala;
    const proceed = () => (original as (...a: unknown[]) => unknown)(...args);

    if (!shouldUseCaptcha()) return proceed();
    if (self.captchalaToken !== null) return proceed();

    self.loading = true;
    m.redraw();

    // Lazy-create a hidden host inside <body> the first time we open the
    // popup; we don't render it inside the composer header anymore because
    // the user explicitly asked for popup-on-submit (no inline widget).
    if (!self.captchalaHost) {
      const host = document.createElement('div');
      host.className = 'CaptchalaComposer-host';
      host.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;overflow:hidden;';
      document.body.appendChild(host);
      self.captchalaHost = host;
    }

    const sdkRef = { current: self.captchalaSdk };
    runPopupChallenge(self.captchala, self.captchalaHost, sdkRef)
      .then((token) => {
        self.captchalaSdk = sdkRef.current;
        self.captchalaToken = token;
        proceed();
      })
      .catch((err: Error) => {
        self.captchalaSdk = sdkRef.current;
        self.loading = false;
        const code = err?.message || '';
        if (code !== 'cancelled') {
          app.alerts.show(
            { type: 'error' },
            app.translator.trans('captchala-flarum.lib.not_completed')
          );
        }
        m.redraw();
      });
  });
}
