# Submission SOP — Flarum

Flarum extensions are distributed by Composer/Packagist; there is **no formal
review process** like a traditional marketplace. Discoverability comes from
three places, in order of importance:

1. **Packagist** — primary distribution channel; `composer require` resolves here.
2. **flarum-extensions.com** — community-run listing site that auto-indexes
   Packagist packages tagged `type: flarum-extension`. Optional but standard.
3. **discuss.flarum.org** — the canonical announcement/discussion thread under
   `/c/extensions`; this is what most operators actually browse.

## 1. Packagist

Prerequisite: GitHub repo at `github.com/Captcha-La/captchala-flarum` (mirrors
`plugins/flarum/`).

1. Sign in to <https://packagist.org> with the maintainer GitHub account.
2. Submit the GitHub URL once — Packagist will index every Git tag from then on.
3. Configure the GitHub → Packagist webhook (Packagist shows the exact URL +
   API token under your profile). Without it, new tags need a manual "Update"
   click on Packagist.
4. Tag a release: `git tag flarum/v1.0.0 && git push --tags`. Packagist picks
   it up within seconds.

`composer require captchala/flarum` should then resolve from any host.

## 2. flarum-extensions.com

This is auto-populated from Packagist. Once the package is on Packagist with
`type: flarum-extension`, the listing typically appears within ~1 hour.

If you want the listing to surface a banner / icon, ensure
`extra.flarum-extension.icon` is filled in (already done in `composer.json`)
and that the GitHub repo's `README.md` has a screenshot near the top — the
listing pulls the first image from the readme.

## 3. discuss.flarum.org thread

Create a thread under <https://discuss.flarum.org/t/extensions>. Recommended
template:

```
Title: [CaptchaLa] CAPTCHA protection for signup, login, password reset & posts

# CaptchaLa

Drop-in CAPTCHA for Flarum. Protects all four key forms with one toggle each.

## Install

    composer require captchala/flarum

## Links

- Dashboard / sign up: https://dash.captcha.la
- Source: https://github.com/Captcha-La/captchala-flarum
- Packagist: https://packagist.org/packages/captchala/flarum

## Screenshots

(...)
```

Discussion thread quality is the largest single driver of adoption, since
there is no review-gated promo channel. Reply to questions promptly for the
first ~2 weeks.

## 4. Versioning & updates

- One canonical version source: `plugins/VERSION`. Keep `composer.json`'s
  `"version"` in sync via `plugins/shared/scripts/sync-version.sh`.
- Push a tag matching `flarum/v<semver>` to trigger CI publish (the CI job
  pushes to the upstream `github.com/Captcha-La/captchala-flarum` repo, which Packagist
  picks up).

## 5. Compatibility caveat — Flarum 1.x

This release targets **Flarum 2.0+** (`flarum/core: ^2.0.0`). Flarum 1.x sites
are still in the wild and will need their own compatibility branch — defer to
phase 2:

- Branch name: `1.x`
- `composer.json#require.flarum/core`: `^1.8`
- Replace the `Flarum\Api\Resource` field calls with the 1.x serializer hooks.

Tracked in `plugins/VERSION` notes; the 1.x branch is not part of this initial
submission.
