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

use Captchala\Cms\Errors;
use Captchala\Flarum\ClientFactory;
use Captchala\Flarum\Settings\SettingsRepository;
use Flarum\Foundation\ValidationException;

/**
 * Shared CaptchaLa token assertion. Each concrete listener subclass declares
 * its own handle($event) and calls $this->assertToken(...).
 */
abstract class AbstractValidate
{
    public function __construct(
        protected ClientFactory $clients,
        protected SettingsRepository $settings,
    ) {
    }

    /**
     * @param mixed $token
     */
    protected function assertToken($token, string $action): void
    {
        if (! $this->clients->isConfigured()) {
            $this->fail('app_disabled');
        }

        $token = is_string($token) ? trim($token) : '';
        if ($token === '') {
            $this->fail('empty_token');
        }

        $client = $this->clients->make();
        // Don't forward client_ip: in cross-domain CDN scenarios the user's
        // browser frequently solves the challenge over IPv6 (browser → cdn)
        // while submitting the form over IPv4 (browser → CF → forum origin).
        // pass_token.bind_ip and our perceived IP would be different ISP-
        // assigned addresses for the same user and can't be reconciled at
        // any middle tier. Per dash backend's documented escape hatch
        // ("未传则跳过") we omit the field — single-use pt_ + short TTL
        // + action match still guarantee anti-replay.
        $result = $client->validate($token, false, null);

        // Log a one-line trace at info level so operators can diagnose
        // "captcha kept failing" without having to enable Flarum debug.
        \Flarum\Foundation\Application::getInstance()
            ?->make('log')
            ?->info('[captchala] validate', [
                'action_expected' => $action,
                'action_got'      => $result->getAction(),
                'valid'           => $result->isValid(),
                'error'           => $result->getError(),
                'offline'         => $result->isOffline(),
                'client_only'     => $result->isClientOnly(),
            ]);

        if (! $result->isValid()) {
            $this->fail($result->getError());
        }

        if ($result->getAction() !== null && $result->getAction() !== $action) {
            $this->fail('token_action_mismatch');
        }
    }

    /**
     * @return never
     */
    protected function fail(?string $code): void
    {
        // Surface both the human-readable message AND the raw backend code
        // so operators don't have to grep the log for the underlying reason.
        $msg = Errors::standardize($code);
        if ($code !== null && $code !== '') {
            $msg .= ' [' . $code . ']';
        }
        throw new ValidationException([
            'captchalaToken' => $msg,
        ]);
    }

    protected function clientIp(): ?string
    {
        // Mirror dash's getRealIp() ordering plus CF-Connecting-IP. Behind
        // Cloudflare, REMOTE_ADDR is the CF edge IP — pass_token.bind_ip is
        // set to the user's real IP via dash's own getRealIp during challenge
        // solve, so we must unwrap to the same real IP here for validate to
        // match (otherwise dash returns binding_mismatch).
        $candidates = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'HTTP_X_CLIENT_IP',
            'REMOTE_ADDR',
        ];
        foreach ($candidates as $h) {
            $v = $_SERVER[$h] ?? '';
            if (! is_string($v) || $v === '') {
                continue;
            }
            // X-Forwarded-For may be comma-separated; take the leftmost hop.
            $parts = explode(',', $v);
            $first = trim((string) ($parts[0] ?? ''));
            if (filter_var($first, FILTER_VALIDATE_IP)) {
                return $first;
            }
        }
        return null;
    }
}
