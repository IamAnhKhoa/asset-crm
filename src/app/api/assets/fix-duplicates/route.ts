import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { SHEET_NAMES, getSheetValues, updateSheetCell } from '@/lib/sheets';
import { purgePattern, purgeCache } from '@/lib/kv-cache';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'admin_full') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await getSheetValues(SHEET_NAMES.ASSETS);
        const idCounts: Record<string, number> = {};
        let fixes = 0;

        // Pass 1: Count initial IDs
        for (let i = 1; i < data.length; i++) {
            const id = (data[i][0] || '').trim();
            if (id) idCounts[id] = (idCounts[id] || 0) + 1;
        }

        // Pass 2: Suffix duplicates
        const processed: Record<string, number> = {};
        for (let i = 1; i < data.length; i++) {
            const id = (data[i][0] || '').trim();
            if (!id) continue;

            processed[id] = (processed[id] || 0) + 1;

            // If this is a duplicate (total count > 1) AND it's not the first occurrence
            if (idCounts[id] > 1 && processed[id] > 1) {
                const newId = `${id} (${processed[id] - 1})`;
                await updateSheetCell(SHEET_NAMES.ASSETS, i + 1, 1, newId);
                fixes++;
            }
        }

        if (fixes > 0) {
            await Promise.all([
                purgePattern('assets:'),
                purgeCache('dashboard')
            ]);
        }

        return NextResponse.json({ success: true, fixes });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
