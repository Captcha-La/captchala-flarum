<?php

/*
 * This file is part of captchala/flarum.
 *
 * Copyright (c) 2026 CaptchaLa.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace Captchala\Flarum;

use Captchala\Flarum\Api\Controller\TestConnectionController;
use Captchala\Flarum\Api\ForumResourceFields;
use Captchala\Flarum\Api\TokenFields;
use Captchala\Flarum\Forum\Controller\ServerTokenController;
use Captchala\Flarum\Listener\RegisterValidate;
use Captchala\Flarum\Listener\ReplyPostValidate;
use Captchala\Flarum\Listener\StartDiscussionValidate;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Resource\PostResource;
use Flarum\Api\Resource\UserResource;
use Flarum\Discussion\Event\Saving as DiscussionSaving;
use Flarum\Extend;
use Flarum\Post\Event\Saving as PostSaving;
use Flarum\User\Event\Saving as UserSaving;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/resources/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/resources/less/admin.less'),

    new Extend\Locales(__DIR__.'/resources/locale'),

    (new Extend\Settings())
        ->default('captchala.app_key', '')
        ->default('captchala.app_secret', '')
        ->default('captchala.product', 'bind')
        ->default('captchala.lang', 'auto')
        ->default('captchala.signup', true)
        ->default('captchala.signin', true)
        ->default('captchala.forgot', true)
        ->default('captchala.post', true)
        ->serializeToForum('captchala.app_key', 'captchala.app_key')
        ->serializeToForum('captchala.product', 'captchala.product')
        ->serializeToForum('captchala.lang', 'captchala.lang')
        ->serializeToForum('captchala.signup', 'captchala.signup', 'boolVal')
        ->serializeToForum('captchala.signin', 'captchala.signin', 'boolVal')
        ->serializeToForum('captchala.forgot', 'captchala.forgot', 'boolVal')
        ->serializeToForum('captchala.post', 'captchala.post', 'boolVal'),

    (new Extend\ApiResource(ForumResource::class))
        ->fields(ForumResourceFields::class),

    (new Extend\ApiResource(UserResource::class))
        ->fields(TokenFields::class),

    (new Extend\ApiResource(DiscussionResource::class))
        ->fields(TokenFields::class),

    (new Extend\ApiResource(PostResource::class))
        ->fields(TokenFields::class),

    (new Extend\Routes('api'))
        ->post('/captchala/server-token', 'captchala.server_token', ServerTokenController::class)
        ->post('/captchala/test', 'captchala.test', TestConnectionController::class),

    (new Extend\Event())
        ->listen(UserSaving::class, RegisterValidate::class)
        ->listen(DiscussionSaving::class, StartDiscussionValidate::class)
        ->listen(PostSaving::class, ReplyPostValidate::class),
];
