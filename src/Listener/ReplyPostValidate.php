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
use Flarum\Post\Event\Saving;
use Illuminate\Support\Arr;

class ReplyPostValidate extends AbstractValidate
{
    public function handle(Saving $event): void
    {
        if ($event->post->exists) {
            return;
        }
        if (! $this->settings->protectsPost()) {
            return;
        }
        // First post of a brand-new discussion is validated under
        // StartDiscussionValidate; skip here so we don't double-charge.
        if ($event->post->number === 1 || $event->post->discussion->first_post_id === null) {
            return;
        }

        $this->assertToken(
            Arr::get($event->data, 'attributes.captchalaToken'),
            Action::FORUM_POST,
        );
    }
}
