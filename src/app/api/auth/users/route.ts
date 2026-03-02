import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, updateUserRole, updateUserProfile } from '@/lib/auth';
import { UserRole } from '@/types';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if ((session?.user as any)?.role !== 'admin_full') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const users = await getAllUsers();
        return NextResponse.json(users);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if ((session?.user as any)?.role !== 'admin_full') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const { email, role, phongBan, tenChon, status } = await req.json();
        if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

        const { updateUserRole, updateUserProfile, updateUserStatus } = await import('@/lib/auth');

        let success = true;
        if (role) {
            const { success: rSuccess } = await updateUserRole(email, role as UserRole);
            success = success && rSuccess;
        }
        if (phongBan !== undefined || tenChon !== undefined) {
            const { success: pSuccess } = await updateUserProfile(email, phongBan || '', tenChon || '');
            success = success && pSuccess;
        }
        if (status) {
            const { success: sSuccess } = await updateUserStatus(email, status);
            success = success && sSuccess;
        }

        return NextResponse.json({ success });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
