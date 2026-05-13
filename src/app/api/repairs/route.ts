import { NextRequest, NextResponse } from 'next/server';
import { getAllRepairTickets, getPendingRepairs, approveRepair, rejectRepair } from '@/lib/history';
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

        const data = await getAllRepairTickets(userCtx);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, row, reason, repairStatus, result: repairResult, handlerNote } = body;
        let result;
        if (action === 'approve') {
            result = await approveRepair(row, { repairStatus, result: repairResult, handlerNote });
        } else if (action === 'reject') {
            result = await rejectRepair(row, reason);
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { createRepairTicket } = await import('@/lib/history');
        const body = await req.json();
        const result = await createRepairTicket(body);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const role = (session.user as any).role;
        if (role !== 'admin_full' && role !== 'admin_holder') {
            return NextResponse.json({ error: 'Không có quyền xóa' }, { status: 403 });
        }

        const body = await req.json();
        const { row, source } = body;
        if (!row) return NextResponse.json({ error: 'Missing row ID' }, { status: 400 });

        const { supabase } = await import('@/lib/supabase');
        const table = source === 'pending' ? 'pending_repairs' : 'repair_history';
        const { error } = await supabase.from(table).delete().eq('id', row);

        if (error) throw error;
        return NextResponse.json({ success: true, message: 'Đã xóa phiếu!' });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
