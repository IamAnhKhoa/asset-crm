import { NextResponse } from 'next/server';
import { isKVConfigured } from '@/lib/kv-cache';
import { kv } from '@vercel/kv';
import { getSheetsClient, SPREADSHEET_ID, SHEET_NAMES } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
    const status: any = {
        kv: 'unknown',
        sheets: 'unknown',
        version: '1.0.2-fix-duplicates',
        timestamp: new Date().toISOString()
    };

    // 1. Check KV
    if (!isKVConfigured()) {
        status.kv = 'not configured';
    } else {
        try {
            await kv.ping();
            status.kv = 'ok';
        } catch (e: any) {
            status.kv = `error: ${e.message}`;
        }
    }

    // 2. Check Sheets
    try {
        const sheets = await getSheetsClient();
        await sheets.spreadsheets.get({
            spreadsheetId: SPREADSHEET_ID,
            fields: 'spreadsheetId'
        });
        status.sheets = 'ok';
    } catch (e: any) {
        status.sheets = `error: ${e.message}`;
    }

    return NextResponse.json(status);
}
