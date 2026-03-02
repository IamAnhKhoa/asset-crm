import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUserProfile } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const user = await getUserByEmail(session.user.email);
        return NextResponse.json(user);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const { phongBan, tenChon, role } = await req.json();

        // If guest, they don't mandatory need phongBan/tenChon
        const finalRole = role || 'user_basic';
        if (finalRole !== 'guest' && (!phongBan || !tenChon)) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const result = await updateUserProfile(
            session.user.email,
            phongBan || '',
            tenChon || session.user.name || '',
            finalRole
        );

        return NextResponse.json(result);
    } catch (e) {
        console.error('API Profile Error:', e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
