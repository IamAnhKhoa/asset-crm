import { NextRequest, NextResponse } from 'next/server';
import { deletePendingCheck } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function DELETE(_: NextRequest, { params }: { params: { row: string } }) {
    try {
        const row = parseInt(params.row);
        const result = await deletePendingCheck(row);
        return NextResponse.json(result);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
