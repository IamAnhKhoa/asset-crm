import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getDashboardStats();
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
