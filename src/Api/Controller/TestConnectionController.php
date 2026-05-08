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

namespace Captchala\Flarum\Api\Controller;

use Captchala\Cms\Action;
use Captchala\Flarum\ClientFactory;
use Flarum\Http\RequestUtil;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * POST /api/captchala/test
 *
 * Admin-only smoke test. Tries to issue a server token using the
 * currently saved app_key / app_secret; on success the credentials are
 * known to be valid and the network reachable. We don't validate a
 * pass token here because that requires a real solved challenge from
 * the browser.
 */
class TestConnectionController implements RequestHandlerInterface
{
    public function __construct(protected ClientFactory $clients)
    {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        RequestUtil::getActor($request)->assertAdmin();

        if (! $this->clients->isConfigured()) {
            return new JsonResponse([
                'ok'    => false,
                'error' => 'app_disabled',
            ], 400);
        }

        $client = $this->clients->make();
        $result = $client->issueServerToken(Action::GENERIC_FORM, null, 60, 1);

        if (! $result->isOk()) {
            return new JsonResponse([
                'ok'    => false,
                'error' => $result->getError() ?? 'unknown_error',
            ], 502);
        }

        return new JsonResponse(['ok' => true]);
    }
}
