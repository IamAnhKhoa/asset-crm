import { NextResponse } from 'next/server';
import { getDepartmentsAndEmployees } from '@/lib/employees';

import { getWithSWR } from '@/lib/kv-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getWithSWR('employees', getDepartmentsAndEmployees, 60, 20);
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('[API Employees] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch employees data",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}
