import { NextRequest, NextResponse } from 'next/server';
import { getPendingChecks, createCheckReport } from '@/lib/history';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserContext } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const userCtx: UserContext = {
            role: (session.user as any).role || 'user_basic',
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const data = await getPendingChecks(userCtx);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await createCheckReport(body);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
