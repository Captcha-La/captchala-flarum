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

namespace Captchala\Flarum;

use Captchala\Client;
use Captchala\Flarum\Settings\SettingsRepository;

/**
 * Builds a configured Captchala\Client from the extension's stored settings.
 *
 * Centralized so both the Listener and the API controllers share the exact
 * same client construction (timeouts, credentials).
 */
class ClientFactory
{
    public function __construct(protected SettingsRepository $settings)
    {
    }

    public function make(): Client
    {
        return new Client($this->settings->appKey(), $this->settings->appSecret());
    }

    public function isConfigured(): bool
    {
        return $this->settings->isConfigured();
    }
}
