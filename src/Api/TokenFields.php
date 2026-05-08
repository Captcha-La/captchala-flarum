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

use Flarum\Api\Schema;

/**
 * Write-only pass-through field for the captcha pass-token.
 *
 * Flarum 2.x's JSON:API schema validates incoming attributes by default,
 * so we have to declare `captchalaToken` here for it to survive the
 * round-trip and reach the Saving event listeners.
 *
 * The field never persists anything; the listeners read it from
 * $event->data['attributes']['captchalaToken'] and discard it.
 */
class TokenFields
{
    public function __invoke(): array
    {
        return [
            Schema\Str::make('captchalaToken')
                ->writableOnCreate()
                ->nullable()
                ->set(fn () => null),
        ];
    }
}
