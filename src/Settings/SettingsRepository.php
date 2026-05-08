<?php

/*
 * This file is part of captchala/flarum.
 *
 * Copyright (c) 2026 CaptchaLa.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare(strict_types=1);

namespace Captchala\Flarum\Settings;

use Flarum\Settings\SettingsRepositoryInterface;

/**
 * Typed accessors for the captchala.* settings.
 *
 * Wraps Flarum's stringly-typed SettingsRepositoryInterface so the rest of
 * the extension never has to remember which key holds which type.
 */
class SettingsRepository
{
    public function __construct(protected SettingsRepositoryInterface $settings)
    {
    }

    public function appKey(): string
    {
        return trim((string) $this->settings->get('captchala.app_key', ''));
    }

    public function appSecret(): string
    {
        return trim((string) $this->settings->get('captchala.app_secret', ''));
    }

    public function product(): string
    {
        $value = (string) $this->settings->get('captchala.product', 'bind');
        return in_array($value, ['popup', 'float', 'embed', 'bind'], true) ? $value : 'bind';
    }

    public function lang(): string
    {
        $value = trim((string) $this->settings->get('captchala.lang', 'auto'));
        return $value === '' ? 'auto' : $value;
    }

    public function isConfigured(): bool
    {
        return $this->appKey() !== '' && $this->appSecret() !== '';
    }

    public function protectsSignup(): bool
    {
        return (bool) $this->settings->get('captchala.signup', true);
    }

    public function protectsSignin(): bool
    {
        return (bool) $this->settings->get('captchala.signin', true);
    }

    public function protectsForgot(): bool
    {
        return (bool) $this->settings->get('captchala.forgot', true);
    }

    public function protectsPost(): bool
    {
        return (bool) $this->settings->get('captchala.post', true);
    }
}
