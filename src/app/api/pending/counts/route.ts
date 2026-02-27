import { NextResponse } from 'next/server';
import { getPendingCounts } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const counts = await getPendingCounts();
        return NextResponse.json(counts);
    } catch (e) {
        return NextResponse.json({ kiemke: 0, suachua: 0 });
    }
}
