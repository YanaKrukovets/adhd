// @ts-check
import { auth } from '@/lib/auth.js';
import { NextResponse } from 'next/server';

export default auth((req) => {
  if (!req.auth) {
    const signInUrl = new URL('/auth/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  // Protect all /app/* routes; API routes handle their own auth
  matcher: ['/app/:path*'],
};
