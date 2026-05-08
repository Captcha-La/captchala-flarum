# CaptchaLa for Flarum

![License](https://img.shields.io/badge/license-MIT-blue.svg)

A [Flarum](https://flarum.org) extension that protects signup, login, forgot
password, and posting against bots and spam, powered by
[CaptchaLa](https://captcha.la).

- Mandatory `server_token` flow — every challenge is bound to the visitor's IP.
- One-click toggles for signup / signin / forgot password / posts.
- Built-in connection test in the admin settings page.
- MIT licensed.

## Installation

```sh
composer require captchala/flarum
```

Then enable **CaptchaLa** in your Flarum admin extensions list and fill in your
**App Key** and **App Secret** from your [CaptchaLa
dashboard](https://dash.captcha.la). Click **Test connection** to verify.

## Updating

```sh
composer update captchala/flarum
```

## Support

- Dashboard: <https://dash.captcha.la>
- Email: supply@captcha.la
- Source: <https://github.com/Captcha-La/captchala-flarum>
