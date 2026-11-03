<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Adds OWASP-recommended HTTP security headers to every response.
 *
 * Headers applied:
 *   - X-Content-Type-Options   : Prevent MIME sniffing
 *   - X-Frame-Options          : Clickjacking protection
 *   - Referrer-Policy          : Limit referrer leakage
 *   - Permissions-Policy       : Restrict browser feature access
 *   - Content-Security-Policy  : Defence-in-depth XSS mitigation
 *                                (kept permissive for SPA; tighten in production as needed)
 *   - Strict-Transport-Security: Enforce HTTPS (only added over HTTPS)
 *   - X-XSS-Protection         : Legacy browser XSS filter (belt-and-suspenders)
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        // Prevent browsers from MIME-sniffing a response away from the declared Content-Type.
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Deny embedding in iframes — prevents clickjacking.
        $response->headers->set('X-Frame-Options', 'DENY');

        // Only send the origin (no path/query) as the Referer header for cross-origin navigation.
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Disable unnecessary browser features.
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');

        // Legacy XSS protection header (belt-and-suspenders for older browsers).
        $response->headers->set('X-XSS-Protection', '1; mode=block');

        // Content-Security-Policy — allows self-hosted resources and inline styles
        // (required for Tailwind-generated styles) while blocking unsafe origins.
        // Tighten script-src / style-src in production once a nonce strategy is adopted.
        //
        // In local development the Vite dev server (default port 5174) serves
        // @react-refresh and other HMR assets from both IPv4 and IPv6 loopback
        // addresses.  Those origins must be whitelisted or the browser will
        // block the scripts and break hot-module-replacement.
        $isDev = app()->environment('local');

        // In dev the Vite server binds to localhost:5174 (forced via vite.config.js
        // server.host = 'localhost') so we only need the IPv4/name form here.
        // We also set ws:// for Vite's HMR WebSocket.
        $viteOrigins   = $isDev ? ' http://localhost:5174' : '';
        $viteWsOrigins = $isDev ? ' ws://localhost:5174' : '';

        $response->headers->set('Content-Security-Policy', implode('; ', [
            "default-src 'self'",
            // script-src controls workers/eval; script-src-elem is set explicitly
            // below to avoid Chrome falling back ambiguously and blocking <script>
            // elements served by the Vite dev server.
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'{$viteOrigins}",
            // Explicit elem directive — Chrome requires this to be set when the
            // page loads scripts from a cross-origin dev server.
            "script-src-elem 'self' 'unsafe-inline'{$viteOrigins}",
            // Google Fonts delivers a CSS file from fonts.googleapis.com; the
            // actual font binaries are fetched from fonts.gstatic.com.
            // style-src-elem is set explicitly for the same Chrome fallback reason
            // as script-src-elem above.
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com{$viteOrigins}",
            "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com{$viteOrigins}",
            "img-src 'self' data: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",               // Google Fonts binaries
            "connect-src 'self'{$viteOrigins}{$viteWsOrigins}",              // Vite WebSocket for HMR in dev
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ]));

        // Strict-Transport-Security — only sent over HTTPS to avoid breaking HTTP dev.
        if ($request->secure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        return $response;
    }
}
