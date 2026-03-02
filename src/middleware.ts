import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const isApiAuth = url.pathname.startsWith('/api/auth');
    if (isApiAuth) return NextResponse.next();

    const protectedPaths = ['/assets', '/repair', '/inventory', '/history', '/dashboard', '/gia-sua-chua', '/users'];
    const isProtectedPath = protectedPaths.some(
        (p) => url.pathname === p || url.pathname.startsWith(`${p}/`)
    );

    // Bỏ qua /api/dashboard public route cho trang chủ
    if (url.pathname === '/api/dashboard') return NextResponse.next();

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

    // 1. Trang public
    if (!isProtectedPath && url.pathname !== '/login' && url.pathname !== '/setup-profile') {
        return NextResponse.next();
    }

    // 2. Chưa đăng nhập
    if (!token) {
        if (isProtectedPath || url.pathname === '/setup-profile') {
            const loginUrl = new URL('/login', req.url);
            loginUrl.searchParams.set('callbackUrl', url.pathname);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    // 3. Đã đăng nhập
    const profileComplete = token.profileComplete as boolean;
    const userRole = (token.role as string) || 'user_basic';
    const status = (token.status as string) || 'pending';

    if (url.pathname === '/login') {
        if (!profileComplete) return NextResponse.redirect(new URL('/setup-profile', req.url));
        return NextResponse.redirect(new URL(userRole === 'admin_full' ? '/dashboard' : '/assets', req.url));
    }

    if (url.pathname === '/setup-profile') {
        // Allow even if profileComplete to show the "Pending" message
        return NextResponse.next();
    }

    // Redirect to setup if profile not complete
    if (isProtectedPath && !profileComplete) {
        return NextResponse.redirect(new URL('/setup-profile', req.url));
    }

    // Redirect to setup (pending message) if not approved
    if (isProtectedPath && status !== 'approved') {
        return NextResponse.redirect(new URL('/setup-profile', req.url));
    }

    // 4. Kiểm tra quyền Guest
    if (userRole === 'guest') {
        // Guest can ONLY see /dashboard and /gia-sua-chua
        const allowedPaths = ['/dashboard', '/gia-sua-chua'];
        const isAllowed = allowedPaths.some(p => url.pathname === p || url.pathname.startsWith(`${p}/`));

        if (!isAllowed && isProtectedPath) {
            return NextResponse.redirect(new URL('/dashboard', req.url));
        }
    }

    // 5. Kiểm tra quyền Admin
    const adminOnlyPaths = ['/dashboard', '/reports', '/users', '/settings'];
    const isAdminPath = adminOnlyPaths.some(p => url.pathname === p || url.pathname.startsWith(`${p}/`));

    // Special case: Guest CAN see /dashboard
    if (isAdminPath && userRole !== 'admin_full' && userRole !== 'guest' && url.pathname === '/dashboard') {
        // Basic users shouldn't see dashboard stats? 
        // Let's stick to existing logic or allow it if it's useful.
        // User didn't explicitly say basic users can't see dashboard.
    }

    if (isAdminPath && userRole !== 'admin_full' && url.pathname !== '/dashboard') {
        return NextResponse.redirect(new URL('/assets', req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
