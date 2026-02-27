import { NextRequest, NextResponse } from 'next/server';
import { getPendingChecks, createCheckReport } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getPendingChecks();
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const result = await createCheckReport(body);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
