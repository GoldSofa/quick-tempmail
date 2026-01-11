import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/core/auth';
import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';

function maybeRateLimitGetSession(request: Request): Response | null {
  const url = new URL(request.url);
  // better-auth session endpoint is served under this catch-all route.
  if (!url.pathname.endsWith('/api/auth/get-session')) {
    return null;
  }

  const intervalMs =
    Number(process.env.AUTH_GET_SESSION_MIN_INTERVAL_MS) ||
    // default: 800ms (enough to stop request storms but still responsive)
    0; // 暂时禁用速率限制以解决 429 问题

  return enforceMinIntervalRateLimit(request, {
    intervalMs,
    keyPrefix: 'auth-get-session',
  });
}

export async function POST(request: Request) {
  const limited = maybeRateLimitGetSession(request);
  if (limited) {
    return limited;
  }

  const auth = await getAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.POST(request);
}

export async function GET(request: Request) {
  const limited = maybeRateLimitGetSession(request);
  if (limited) {
    return limited;
  }

  const auth = await getAuth();
  const handler = toNextJsHandler(auth.handler);
  return handler.GET(request);
}

export async function OPTIONS(request: Request) {
  const { envConfigs } = await import('@/config');
  const origin = request.headers.get('origin');

  const allowedOrigins = envConfigs.app_url
    ? [
      envConfigs.app_url,
      envConfigs.app_url.includes('://www.')
        ? envConfigs.app_url.replace('://www.', '://')
        : envConfigs.app_url.replace('://', '://www.'),
    ]
    : [];

  // Also allow ngrok domains for development
  const isNgrokOrigin = origin?.endsWith('.ngrok-free.dev');
  // Also allow localhost for development
  const isLocalhost = origin ? /http:\/\/localhost:\d+/.test(origin) : false;

  if (
    origin &&
    (allowedOrigins.includes(origin) || isNgrokOrigin || isLocalhost)
  ) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
        'Access-Control-Allow-Credentials': 'true',
      },
    });
  }

  return new Response(null, { status: 204 });
}
