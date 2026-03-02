import { NextRequest, NextResponse } from 'next/server';
import { getPeriodComparison, ComparisonPeriod } from '@/lib/dashboard';
import { getWithSWR } from '@/lib/kv-cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const period = (url.searchParams.get('period') as ComparisonPeriod) || 'month';

        const data = await getWithSWR(`comparison:${period}`, () => getPeriodComparison(period), 10, 2);
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[API Comparison] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch comparison data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}
