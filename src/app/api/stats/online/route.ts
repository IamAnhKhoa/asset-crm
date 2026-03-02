import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { getOnlineUsers, trackUserActivity } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Track the current user's activity while they are fetching online status
        const session = await getServerSession(authOptions);
        if (session?.user?.email) {
            trackUserActivity(session.user.email).catch(() => { });
        }

        const count = await getOnlineUsers();
        return NextResponse.json({ count });
    } catch (e) {
        return NextResponse.json({ count: 0 });
    }
}
