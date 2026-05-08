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

namespace Captchala\Flarum\Forum\Controller;

use Captchala\Cms\Action;
use Captchala\Flarum\ClientFactory;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * POST /api/captchala/server-token
 *
 * Body: { "action": "register" | "login" | "lost_password" | "forum_post" }
 *
 * Issues a one-time sct_<hex> server token for the requested action,
 * binding it to the caller's IP. The browser SDK uses this token at
 * submit time to obtain a pt_<hex> pass token, which is then attached
 * to the form as `attributes.captchalaToken` and validated server-side
 * by the Saving listeners.
 */
class ServerTokenController implements RequestHandlerInterface
{
    public function __construct(protected ClientFactory $clients)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        if (! $this->clients->isConfigured()) {
            return new JsonResponse(['error' => 'app_disabled'], 503);
        }

        $body = (array) $request->getParsedBody();
        $action = (string) Arr::get($body, 'action', '');

        if (! Action::isValid($action)) {
            return new JsonResponse(['error' => 'invalid_action'], 400);
        }

        $client = $this->clients->make();
        $result = $client->issueServerToken($action, $this->clientIp($request), 300, 3);

        if (! $result->isOk()) {
            return new JsonResponse([
                'error' => $result->getError() ?? 'unknown_error',
            ], 502);
        }

        return new JsonResponse([
            'server_token' => $result->getToken(),
            'expires_in'   => $result->getExpiresIn(),
            'action'       => $action,
        ]);
    }

    protected function clientIp(ServerRequestInterface $request): ?string
    {
        $params = $request->getServerParams();
        $ip = $params['REMOTE_ADDR'] ?? null;
        return is_string($ip) && $ip !== '' ? $ip : null;
    }
}
