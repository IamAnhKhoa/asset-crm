import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { kv } from '@vercel/kv';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const email = session.user.email;
        const liveStatus = await kv.get(`status:${email}`);

        return NextResponse.json({ status: liveStatus });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
