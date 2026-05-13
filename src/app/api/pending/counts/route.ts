import { NextResponse } from 'next/server';
import { getPendingCounts } from '@/lib/history';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserContext } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ kiemke: 0, suachua: 0 });
        const userCtx: UserContext = {
            role: (session.user as any).role || 'user_basic',
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const counts = await getPendingCounts(userCtx);
        return NextResponse.json(counts);
    } catch (e) {
        return NextResponse.json({ kiemke: 0, suachua: 0 });
    }
}
