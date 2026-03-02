import { NextResponse } from 'next/server';
import { getSheetValues, SHEET_NAMES } from '@/lib/sheets';
import * as XLSX from 'xlsx';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if ((session?.user as any)?.role !== 'admin_full') {
            return new NextResponse('Forbidden', { status: 403 });
        }

        const wb = XLSX.utils.book_new();

        // Backup all primary sheets
        const sheetsToBackup = Object.values(SHEET_NAMES);

        for (const sheetName of sheetsToBackup) {
            try {
                const values = await getSheetValues(sheetName);
                if (values && values.length > 0) {
                    const ws = XLSX.utils.aoa_to_sheet(values);
                    XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31)); // Excel limit 31 chars
                }
            } catch (err) {
                console.error(`Failed to backup sheet ${sheetName}:`, err);
            }
        }

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const fileName = `Backup_Database_${dateStr}.xlsx`;

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });
    } catch (e) {
        console.error('Backup error:', e);
        return new NextResponse(String(e), { status: 500 });
    }
}
