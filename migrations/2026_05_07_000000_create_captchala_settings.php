<?php

/*
 * This file is part of captchala/flarum.
 *
 * Copyright (c) 2026 CaptchaLa.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

use Flarum\Settings\SettingsRepositoryInterface;
use Illuminate\Database\Schema\Builder;

/**
 * Seed default values for the captchala.* settings on first install.
 *
 * Booleans are written as strings ('1' / '0') because Flarum's settings
 * table stores everything as varchar — matches what
 * `Extend\Settings::default(...)` would write the first time the value
 * is read, but doing it eagerly here means the admin page renders with
 * the right toggles already on.
 *
 * The `down` step removes our keys so disabling/uninstalling the
 * extension doesn't leave orphan settings rows behind.
 */
return [
    'up' => function (Builder $schema) {
        /** @var SettingsRepositoryInterface $settings */
        $settings = resolve(SettingsRepositoryInterface::class);

        $defaults = [
            'captchala.app_key'    => '',
            'captchala.app_secret' => '',
            'captchala.product'    => 'bind',
            'captchala.lang'       => 'auto',
            'captchala.signup'     => '1',
            'captchala.signin'     => '1',
            'captchala.forgot'     => '1',
            'captchala.post'       => '1',
        ];

        foreach ($defaults as $key => $value) {
            if ($settings->get($key) === null) {
                $settings->set($key, $value);
            }
        }
    },

    'down' => function (Builder $schema) {
        /** @var SettingsRepositoryInterface $settings */
        $settings = resolve(SettingsRepositoryInterface::class);

        $keys = [
            'captchala.app_key',
            'captchala.app_secret',
            'captchala.product',
            'captchala.lang',
            'captchala.signup',
            'captchala.signin',
            'captchala.forgot',
            'captchala.post',
        ];

        foreach ($keys as $key) {
            $settings->delete($key);
        }
    },
];
