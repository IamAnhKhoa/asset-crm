import { NextResponse } from 'next/server';
import { getSheetValues, SHEET_NAMES } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const data = await getSheetValues(SHEET_NAMES.ASSETS);
        return NextResponse.json({ rawData: data.slice(0, 5) });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
