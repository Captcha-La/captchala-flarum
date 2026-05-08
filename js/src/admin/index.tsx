import app from 'flarum/admin/app';
import Extend from 'flarum/common/extenders';
import extractText from 'flarum/common/utils/extractText';
import CaptchalaPage from './components/CaptchalaPage';

export const extend = [
  new Extend.Admin()
    .page(CaptchalaPage)
    .setting(() => ({
      setting: 'captchala.app_key',
      label: app.translator.trans('captchala-flarum.admin.settings.app_key_label'),
      help: app.translator.trans('captchala-flarum.admin.settings.app_key_help', {
        a: <a href="https://dash.captcha.la" target="_blank" rel="noopener" />,
      }),
      type: 'text',
      required: true,
      autocomplete: 'off',
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: false,
    }))
    .setting(() => ({
      setting: 'captchala.app_secret',
      label: app.translator.trans('captchala-flarum.admin.settings.app_secret_label'),
      help: app.translator.trans('captchala-flarum.admin.settings.app_secret_help'),
      type: 'password',
      required: true,
      autocomplete: 'new-password',
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: false,
    }))
    .setting(() => ({
      setting: 'captchala.product',
      label: app.translator.trans('captchala-flarum.admin.settings.product_label'),
      help: app.translator.trans('captchala-flarum.admin.settings.product_help'),
      type: 'select',
      default: 'bind',
      options: {
        bind: extractText(app.translator.trans('captchala-flarum.admin.settings.product_options.bind')),
        popup: extractText(app.translator.trans('captchala-flarum.admin.settings.product_options.popup')),
        float: extractText(app.translator.trans('captchala-flarum.admin.settings.product_options.float')),
        embed: extractText(app.translator.trans('captchala-flarum.admin.settings.product_options.embed')),
      },
    }))
    .setting(() => ({
      setting: 'captchala.lang',
      label: app.translator.trans('captchala-flarum.admin.settings.lang_label'),
      help: app.translator.trans('captchala-flarum.admin.settings.lang_help'),
      type: 'text',
      placeholder: 'auto',
    }))
    .setting(() => ({
      setting: 'captchala.signup',
      type: 'bool',
      label: app.translator.trans('captchala-flarum.admin.settings.signup'),
    }))
    .setting(() => ({
      setting: 'captchala.signin',
      type: 'bool',
      label: app.translator.trans('captchala-flarum.admin.settings.signin'),
    }))
    .setting(() => ({
      setting: 'captchala.forgot',
      type: 'bool',
      label: app.translator.trans('captchala-flarum.admin.settings.forgot'),
    }))
    .setting(() => ({
      setting: 'captchala.post',
      type: 'bool',
      label: app.translator.trans('captchala-flarum.admin.settings.post'),
    })),
];
