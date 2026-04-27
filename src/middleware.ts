import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'alphatrack_session';
const BACKEND_URL  = process.env.PYTHON_BACKEND_URL ?? 'http://localhost:8000';

const PUBLIC_PREFIXES = ['/login', '/register', '/invite', '/api', '/_next'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(p => pathname.startsWith(p)) || pathname.includes('.');
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    const res = NextResponse.redirect(new URL('/login', request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  try {
    const check = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: { 'x-session-token': token },
      cache: 'no-store',
    });

    if (!check.ok) {
      const res = NextResponse.redirect(new URL('/login', request.url));
      res.cookies.delete(COOKIE_NAME);
      return res;
    }
  } catch {}

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/tasks', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
