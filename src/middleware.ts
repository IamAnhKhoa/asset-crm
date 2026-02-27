import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
    const basicAuth = req.headers.get('authorization');
    const url = req.nextUrl;

    // Protect these routes
    const protectedPaths = ['/assets', '/repair', '/inventory', '/history', '/dashboard'];
    // Check if the current path starts with any protected path
    const isProtectedPath = protectedPaths.some((p) => {
        // Exclude the public dashboard API endpoint
        if (url.pathname === '/api/dashboard') return false;

        // Exact match for the base paths or starts with for subpaths
        return url.pathname === p || url.pathname.startsWith(`${p}/`);
    });

    if (isProtectedPath) {
        if (basicAuth) {
            const authValue = basicAuth.split(' ')[1];
            const [user, pwd] = atob(authValue).split(':');

            const isMainAdmin = user === 'admin' && pwd === 'Sockladien1@';

            if (isMainAdmin) {
                return NextResponse.next();
            }
        }

        return new NextResponse('Auth Required.', {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
        });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
