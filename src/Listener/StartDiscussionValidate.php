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
use Flarum\Discussion\Event\Saving;
use Illuminate\Support\Arr;

class StartDiscussionValidate extends AbstractValidate
{
    public function handle(Saving $event): void
    {
        if ($event->discussion->exists) {
            return;
        }
        if (! $this->settings->protectsPost()) {
            return;
        }

        $this->assertToken(
            Arr::get($event->data, 'attributes.captchalaToken'),
            Action::FORUM_POST,
        );
    }
}
