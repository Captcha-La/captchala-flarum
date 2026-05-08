import app from 'flarum/common/app';
import type { AlertAttrs } from 'flarum/common/components/Alert';

export type CaptchalaAction = 'register' | 'login' | 'lost_password' | 'forum_post';

type ErrorCallback = (alertAttrs: AlertAttrs) => void;

interface ServerTokenResponse {
  server_token: string;
  expires_in?: number | null;
  action?: string;
}

/**
 * Per-form state for the CaptchaLa widget.
 *
 * One instance per modal / composer. Holds the configuration pulled off
 * `app.forum.attribute(...)`, the action this form maps to, and the
 * cached server_token (sct_) issued by the Flarum backend on demand.
 *
 * The pt_ pass token returned by the loader's onSuccess is held by the
 * caller (modal / composer), not here, because the timing of submit is
 * controlled by the caller.
 */
export default class CaptchalaState {
  appKey: string;
  product: string;
  lang: string;
  action: CaptchalaAction;
  serverToken: string | null = null;
  passToken: string | null = null;
  /** SDK instance returned by Captchala.init({...}). Stored so reset()
   * can tear it down before a re-mount with a fresh sct_. */
  instance: any = null;
  /** Caller passed at oncreate time — invoked by reset() to remount the
   * widget after we've fetched a new server_token. */
  remount: (() => Promise<void>) | null = null;
  errorCallback: ErrorCallback;

  constructor(action: CaptchalaAction, errorCallback: ErrorCallback | null = null) {
    const attrs = (app.forum.data?.attributes ?? {}) as Record<string, string>;

    this.appKey = attrs['captchala.app_key'] || '';
    this.product = attrs['captchala.product'] || 'bind';
    this.lang = attrs['captchala.lang'] || 'auto';
    this.action = action;
    this.errorCallback =
      errorCallback ||
      ((alertAttrs) => {
        app.alerts.show(alertAttrs);
      });
  }

  /**
   * True when the forum has both an app_key advertised (configured()
   * boolean is server-side) and we have an action mapped — i.e. we
   * should mount the widget.
   */
  configured(): boolean {
    return !!app.forum.attribute('captchala.configured') && this.appKey !== '';
  }

  /**
   * Fetch a fresh server_token (sct_) for this action, scoped to the
   * caller's IP server-side. Cached for the life of the state object so
   * a single mount uses one server_token end-to-end.
   */
  async ensureServerToken(): Promise<string> {
    if (this.serverToken) return this.serverToken;

    const response = (await app.request<ServerTokenResponse>({
      method: 'POST',
      url: `${app.forum.attribute('apiUrl')}/captchala/server-token`,
      body: { action: this.action },
    })) as ServerTokenResponse;

    if (!response?.server_token) {
      throw new Error('captchala: empty server token in response');
    }
    this.serverToken = response.server_token;
    return this.serverToken;
  }

  reset(): void {
    // Clear the caches so ensureServerToken() pulls fresh sct_ next call.
    this.serverToken = null;
    this.passToken = null;

    // Destroy current SDK instance — its sct_ is now stale (consumed by
    // the failed submission). Calling reset() alone is not enough: the
    // SDK was init'd with the old sct_ and won't pick up a new one.
    try {
      this.instance?.destroy?.();
    } catch {
      /* ignore */
    }
    this.instance = null;

    // Re-mount the widget with a freshly-issued sct_. The component
    // registered this callback on oncreate.
    this.remount?.().catch(() => {
      /* errors are surfaced via errorCallback inside remount() */
    });
  }
}
