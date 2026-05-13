import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const stats = await getDashboardStats();
        return NextResponse.json(stats);
    } catch (e: any) {
        console.error('[API Dashboard] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch dashboard data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}
