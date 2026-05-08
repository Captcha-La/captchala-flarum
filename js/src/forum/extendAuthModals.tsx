import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import type ItemList from 'flarum/common/utils/ItemList';
import type Mithril from 'mithril';
import type { AlertAttrs } from 'flarum/common/components/Alert';
import CaptchalaState, { CaptchalaAction } from '../common/states/CaptchalaState';
import Captchala from '../common/components/Captchala';

interface ModalWithCaptchala {
  captchala: CaptchalaState;
  captchalaToken: string | null;
  alertAttrs: AlertAttrs | null;
  loading: boolean;
  loaded(): void;
  onsubmit(e: Event): void;
}

type AuthModalKind = 'signup' | 'signin' | 'forgot';

interface AuthModalConfig {
  modulePath: string;
  type: AuthModalKind;
  action: CaptchalaAction;
  dataMethod: string;
}

function applyAuthModalExtension({ modulePath, type, action, dataMethod }: AuthModalConfig): void {
  const isEnabled = () => !!app.forum.attribute(`captchala.${type}`);
  const shouldApply = () => !!app.forum.attribute('captchala.configured') && isEnabled();

  extend(modulePath, 'oninit', function () {
    if (!shouldApply()) return;

    const self = this as unknown as ModalWithCaptchala;
    self.captchala = new CaptchalaState(action, (alertAttrs) => {
      // Removes the spinner on the submit button so we can try again.
      self.loaded();
      self.alertAttrs = alertAttrs;
    });
    self.captchalaToken = null;
  });

  extend(modulePath, dataMethod, function (data: Record<string, unknown>) {
    if (!shouldApply()) return;
    const self = this as unknown as ModalWithCaptchala;
    data.captchalaToken = self.captchalaToken ?? '';
  });

  extend(modulePath, 'fields', function (fields: ItemList<Mithril.Children>) {
    if (!shouldApply()) return;
    const self = this as unknown as ModalWithCaptchala;
    fields.add('captchala', <Captchala state={self.captchala} />, -5);
  });

  extend(modulePath, 'onerror', function (_: unknown, ...args: unknown[]) {
    if (!shouldApply()) return;
    const self = this as unknown as ModalWithCaptchala;
    self.captchalaToken = null;
    self.captchala.reset();

    // The signin endpoint returns an HTML error page rather than structured
    // JSON for validation failures, so the alert content is empty by the
    // time it reaches us. We fall back to a generic captcha message.
    const error = args[0] as { alert?: { content?: Mithril.Children } };
    if (type === 'signin' && error?.alert && (!error.alert.content || !(error.alert.content as unknown[]).length)) {
      error.alert.content = app.translator.trans('captchala-flarum.lib.rejected');
    }
  });

  override(modulePath, 'onsubmit', function (original: unknown, ...args: unknown[]) {
    const self = this as unknown as ModalWithCaptchala;
    const e = args[0] as Event;
    const proceed = () => (original as (e: Event) => unknown)(e);

    if (!shouldApply()) {
      return proceed();
    }
    if (self.captchalaToken !== null) {
      return proceed();
    }

    // Read the pt_<token> resolved by the inline Captchala component
    // when the user solved the challenge. If empty, halt with a
    // "please solve the captcha first" message rather than submitting
    // a request that the server will only reject.
    const token = self.captchala.passToken || '';
    if (!token) {
      e.preventDefault();
      self.alertAttrs = {
        type: 'error',
        content: app.translator.trans('captchala-flarum.lib.not_completed'),
      };
      m.redraw();
      return;
    }
    self.captchalaToken = token;
    return proceed();
  });
}

export default function extendAuthModals(): void {
  applyAuthModalExtension({
    modulePath: 'flarum/forum/components/SignUpModal',
    type: 'signup',
    action: 'register',
    dataMethod: 'submitData',
  });
  applyAuthModalExtension({
    modulePath: 'flarum/forum/components/LogInModal',
    type: 'signin',
    action: 'login',
    dataMethod: 'loginParams',
  });
  applyAuthModalExtension({
    modulePath: 'flarum/forum/components/ForgotPasswordModal',
    type: 'forgot',
    action: 'lost_password',
    dataMethod: 'requestParams',
  });
}
