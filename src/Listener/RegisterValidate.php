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

namespace Captchala\Flarum\Listener;

use Captchala\Cms\Action;
use Flarum\User\Event\Saving;
use Illuminate\Support\Arr;

class RegisterValidate extends AbstractValidate
{
    public function handle(Saving $event): void
    {
        if ($event->user->exists) {
            return;
        }
        if (! $this->settings->protectsSignup()) {
            return;
        }
        if ($event->actor->isAdmin()) {
            return;
        }

        $this->assertToken(
            Arr::get($event->data, 'attributes.captchalaToken'),
            Action::REGISTER,
        );
    }
}
