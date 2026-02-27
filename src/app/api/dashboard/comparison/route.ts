import { NextRequest, NextResponse } from 'next/server';
import { getPeriodComparison, ComparisonPeriod } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const period = (searchParams.get('period') || 'week') as ComparisonPeriod;
        const data = await getPeriodComparison(period);
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
