import type Mithril from 'mithril';
import Component, { ComponentAttrs } from 'flarum/common/Component';
import CaptchalaState from '../states/CaptchalaState';

interface CaptchalaAttrs extends ComponentAttrs {
  state: CaptchalaState;
}

const LOADER_URL = 'https://cdn.captcha-cdn.net/captchala-loader.js';
const CSS_URL = 'https://cdn.captcha-cdn.net/captchala.css';

let loaderPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).loadCaptchala) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${LOADER_URL}"]`);
    const onReady = () => ((window as any).loadCaptchala ? resolve() : reject(new Error('loader ran but loadCaptchala missing')));
    if (existing) {
      if ((window as any).loadCaptchala) return resolve();
      existing.addEventListener('load', onReady, { once: true });
      existing.addEventListener('error', () => reject(new Error('captchala loader failed to load')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = LOADER_URL;
    script.async = true;
    script.defer = true;
    script.onload = onReady;
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error('captchala loader failed to load'));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/**
 * Renders the CaptchaLa widget inside a Shadow DOM root so the host's
 * CSS (Flarum theme, .Form-group resets, etc.) cannot leak in. The SDK
 * then appendTo's a <div> inside the shadow tree; we explicitly link
 * the CDN stylesheet inside the shadow root so the widget keeps its
 * own styling.
 */
export default class Captchala extends Component<CaptchalaAttrs> {
  view(): Mithril.Children {
    const { state } = this.attrs;
    if (!state.configured()) return null;
    return (
      <div className="Form-group CaptchalaContainer">
        <div className="Captchala-host" style="display:block;width:100%;" />
      </div>
    );
  }

  async oncreate(vnode: Mithril.VnodeDOM<CaptchalaAttrs, this>): Promise<void> {
    super.oncreate(vnode);
    const { state } = this.attrs;
    if (!state.configured()) return;

    const host = vnode.dom.querySelector<HTMLElement>('.Captchala-host');
    if (!host) return;

    // Register a remount closure on state so reset() can rebuild the
    // widget with a fresh sct_ after the host form rejects the submission.
    state.remount = () => this.mount(host);
    return this.mount(host);
  }

  private async mount(host: HTMLElement): Promise<void> {
    const { state } = this.attrs;
    if (!state.configured()) return;

    // Shadow root isolates host theme CSS from the widget. We then add
    // a <link> for the SDK's own stylesheet inside the shadow tree so
    // the widget keeps its branding intact.
    const shadow: ShadowRoot =
      host.shadowRoot ??
      (typeof host.attachShadow === 'function'
        ? host.attachShadow({ mode: 'open' })
        : (host as unknown as ShadowRoot));

    if (!shadow.querySelector(`link[href="${CSS_URL}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      shadow.appendChild(link);
    }

    // Inside-shadow style sheet to force SDK-injected children full-width.
    if (!shadow.querySelector('style[data-captchala-fit]')) {
      const style = document.createElement('style');
      style.setAttribute('data-captchala-fit', '');
      style.textContent = `
        /* Reset every CSS property that *inherits* across the shadow
           boundary so host themes (e.g. Flarum's .Form--centered which
           sets text-align:center) don't bleed into the SDK widget. */
        :host {
          all: initial;
          display: block;
          width: 100%;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.4;
          color: inherit;
          text-align: left;
          direction: ltr;
        }
        .Captchala-widget { display:block; width:100%; min-height:60px; box-sizing:border-box; text-align:left; }
        .Captchala-widget > :first-child { width:100% !important; max-width:100%; box-sizing:border-box; }
      `;
      shadow.appendChild(style);
    }

    let target = shadow.querySelector<HTMLDivElement>('.Captchala-widget');
    if (!target) {
      target = document.createElement('div');
      target.className = 'Captchala-widget';
      shadow.appendChild(target);
    } else {
      // Re-mount path: blow away whatever the previous SDK instance
      // injected so the new instance starts from a clean slate.
      target.innerHTML = '';
    }

    try {
      const serverToken = await state.ensureServerToken();
      await loadScript();
      const loadCaptchala = (window as any).loadCaptchala;
      if (!loadCaptchala) throw new Error('loadCaptchala missing');

      // Force popup mode in auth modals: Flarum's modals (especially
      // ForgotPassword) have a fixed/short content height, and any inline
      // widget — float's panel, embed's expanded challenge — gets clipped
      // or hidden by the modal's overflow. Popup renders only a trigger
      // bar inside the modal and opens the actual challenge in a fullscreen
      // overlay above everything, so modal height is irrelevant. Bind is
      // collapsed to popup too: auth modals don't expose a stable
      // submit-button selector for the SDK to bind to anyway.
      const product = 'popup';

      loadCaptchala(() => {
        const Captchala = (window as any).Captchala;
        if (!Captchala?.init) return;
        const inst = Captchala.init({
          appKey: state.appKey,
          serverToken,
          action: state.action,
          product,
          lang: state.lang || undefined,
        })
          .onSuccess((res: any) => {
            state.passToken = (res && res.token) || '';
          })
          .onError((err: any) => {
            state.passToken = null;
            // SDK's onError ships a plain string formatted as
            //   "<human msg> (<code>)"
            // (see CaptchalaCore.handleError). Pull the code out of the
            // trailing parens so we can route on the canonical taxonomy.
            const raw = typeof err === 'string' ? err : err?.message ?? String(err ?? '');
            const m = raw.match(/\(([a-z_]+)\)\s*$/);
            const code = m ? m[1] : (err?.code || err?.error || '');
            // Anything in the server_token family is fixable by minting
            // a fresh sct_ on the host and re-mounting; same for the
            // generic token/challenge expiration paths the SDK can emit.
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
              state.reset();
              return;
            }
            state.errorCallback({
              type: 'error',
              content: raw || 'Captcha error',
            });
          });
        inst.appendTo(target!);
        // Keep the SDK instance reachable so state.reset() can call
        // inst.reset() after the host form rejects the submission.
        state.instance = inst;
      });
    } catch (e) {
      state.errorCallback({
        type: 'error',
        content: 'Captcha load failed',
      });
    }
  }

  onbeforeremove(): void {
    // Tear down the SDK instance and unregister the remount closure so
    // the next mount of this component (e.g. modal re-opens) re-creates
    // everything from scratch. Don't call reset() here — that would
    // try to remount on a vnode that's about to disappear.
    const { state } = this.attrs;
    try {
      state.instance?.destroy?.();
    } catch {
      /* ignore */
    }
    state.instance = null;
    state.remount = null;
    state.serverToken = null;
    state.passToken = null;
  }
}
