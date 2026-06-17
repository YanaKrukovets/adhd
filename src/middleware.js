// @ts-check
import { NextResponse } from 'next/server';

// Middleware runs on the Edge runtime, which cannot open TCP/Postgres
// connections — so it must NOT import the DB-backed `auth()` (that hangs and
// triggers MIDDLEWARE_INVOCATION_TIMEOUT). Instead we do a cheap presence check
// on the Auth.js session cookie. Real session validation happens server-side in
// the data layer / API routes (which run on Node and call `auth()`).
export function middleware(/** @type {import('next/server').NextRequest} */ req) {
  const hasSession =
    req.cookies.has('authjs.session-token') ||
    req.cookies.has('__Secure-authjs.session-token');

  if (!hasSession) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all /app/* routes; API routes handle their own auth
  matcher: ['/app/:path*'],
};
