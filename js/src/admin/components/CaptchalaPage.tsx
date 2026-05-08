import app from 'flarum/admin/app';
import ExtensionPage, { ExtensionPageAttrs } from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import Alert, { AlertAttrs } from 'flarum/common/components/Alert';
import ItemList from 'flarum/common/utils/ItemList';
import type Mithril from 'mithril';

/**
 * Settings page with a built-in "Test connection" panel.
 *
 * Mirrors FoF reCAPTCHA's RecaptchaPage layout: super.sections() yields
 * the standard settings + permissions panes, and we slot our test panel
 * in at the bottom. The test calls POST /captchala/test which simply
 * tries to issue a server token with the saved credentials.
 */
export default class CaptchalaPage extends ExtensionPage {
  testing: boolean = false;
  alert: AlertAttrs | null = null;

  sections(vnode: Mithril.VnodeDOM<ExtensionPageAttrs, this>): ItemList<unknown> {
    const items = super.sections(vnode);
    items.add('captchala-test', this.renderTestPanel(), -5);
    items.setPriority('permissions', -1);
    return items;
  }

  renderTestPanel(): Mithril.Children {
    return (
      <div className="CaptchalaPage-test">
        <div className="ExtensionPage-permissions-header">
          <div className="container">
            <h2 className="ExtensionTitle">{app.translator.trans('captchala-flarum.admin.test.title')}</h2>
          </div>
        </div>
        <div className="container">
          <p className="helpText">{app.translator.trans('captchala-flarum.admin.test.help_text')}</p>
          {this.alert ? <Alert {...this.alert} dismissible={false} /> : null}
          <Button className="Button Button--primary" loading={this.testing} onclick={this.runTest.bind(this)}>
            {app.translator.trans('captchala-flarum.admin.test.button')}
          </Button>
        </div>
      </div>
    );
  }

  async runTest(): Promise<void> {
    this.testing = true;
    this.alert = null;
    m.redraw();

    try {
      await app.request({
        method: 'POST',
        url: `${app.forum.attribute('apiUrl')}/captchala/test`,
        errorHandler: () => {},
      });

      this.alert = {
        type: 'success',
        content: app.translator.trans('captchala-flarum.admin.test.success'),
      };
    } catch (error) {
      const detail = (error as { response?: { error?: string } })?.response?.error ?? 'unknown_error';
      this.alert = {
        type: 'error',
        content: app.translator.trans('captchala-flarum.admin.test.failure', { reason: detail }),
      };
    } finally {
      this.testing = false;
      m.redraw();
    }
  }
}
