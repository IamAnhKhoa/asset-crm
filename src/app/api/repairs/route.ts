import { NextRequest, NextResponse } from 'next/server';
import { getAllRepairTickets, getPendingRepairs, approveRepair, rejectRepair } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getAllRepairTickets();
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
