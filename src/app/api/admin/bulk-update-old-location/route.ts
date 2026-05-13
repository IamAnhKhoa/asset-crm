import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateAsset } from '@/lib/assets';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        let isAdmin = false;

        // 1. Try auth session
        const session = await getServerSession(authOptions);
        if (session?.user && (session.user as any).role === 'admin_full') {
            isAdmin = true;
        }

        // 2. Try secret header (for local scripts)
        const secret = req.headers.get('x-admin-secret');
        if (secret === process.env.ADMIN_SECRET) {
            isAdmin = true;
        }

        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { updates } = body;

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const update of updates) {
            const { id, oldLocation, status } = update;
            if (!id) continue;

            const updateData: any = {};
            if (oldLocation !== undefined) updateData.oldLocation = oldLocation;
            if (status !== undefined) updateData.status = status;

            if (Object.keys(updateData).length > 0) {
                const result = await updateAsset(id, updateData);
                if (!result.success) {
                    errorCount++;
                    errors.push({ id, message: result.message });
                } else {
                    successCount++;
                }
            }
        }

        return NextResponse.json({ success: true, successCount, errorCount, errors });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
    }
}
