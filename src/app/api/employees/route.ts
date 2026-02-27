import { NextResponse } from 'next/server';
import { getDepartmentsAndEmployees } from '@/lib/employees';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getDepartmentsAndEmployees();
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
    }
}
