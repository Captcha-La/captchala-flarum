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

namespace Captchala\Flarum\Api;

use Captchala\Flarum\Settings\SettingsRepository;
use Flarum\Api\Schema;

/**
 * Forum resource fields exposing CaptchaLa configuration to the JS bundle.
 *
 * The frontend reads these via `app.forum.attribute('captchala.<field>')`
 * to decide whether to mount the widget and which app key / product /
 * lang to feed it.
 */
class ForumResourceFields
{
    public function __construct(protected SettingsRepository $settings)
    {
    }

    public function __invoke(): array
    {
        return [
            Schema\Boolean::make('captchala.configured')
                ->get(fn () => $this->settings->isConfigured()),
        ];
    }
}
