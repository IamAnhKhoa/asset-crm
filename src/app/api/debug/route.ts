import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const key = process.env.GOOGLE_PRIVATE_KEY;
        const id = process.env.GOOGLE_SPREADSHEET_ID;

        if (!email) return NextResponse.json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL' });
        if (!key) return NextResponse.json({ error: 'Missing GOOGLE_PRIVATE_KEY' });
        if (!id) return NextResponse.json({ error: 'Missing GOOGLE_SPREADSHEET_ID' });

        // Try to connect
        const { getSheetsClient, SPREADSHEET_ID, getSheetValues } = await import('@/lib/sheets');
        const data = await getSheetValues('TaiSan');
        return NextResponse.json({
            ok: true,
            spreadsheetId: id,
            email,
            rowCount: data.length,
            firstRow: data[0],
        });
    } catch (e: any) {
        return NextResponse.json({
            ok: false,
            error: e?.message || String(e),
            stack: e?.stack?.split('\n').slice(0, 5),
        }, { status: 500 });
    }
}
