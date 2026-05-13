import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user || (session.user as any).role !== 'admin_full') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: assets, error } = await supabase
            .from('assets')
            .select('id')
            .order('id', { ascending: true });

        if (error) throw error;

        const idCounts: Record<string, number> = {};
        let fixes = 0;

        // Count IDs
        for (const asset of (assets || [])) {
            const id = (asset.id || '').trim();
            if (id) idCounts[id] = (idCounts[id] || 0) + 1;
        }

        // Fix duplicates
        const processed: Record<string, number> = {};
        for (const asset of (assets || [])) {
            const id = (asset.id || '').trim();
            if (!id) continue;

            processed[id] = (processed[id] || 0) + 1;

            if (idCounts[id] > 1 && processed[id] > 1) {
                const newId = `${id} (${processed[id] - 1})`;
                // In Supabase with TEXT primary key, we need to update the ID
                // This requires delete + insert since PK can't be updated
                const { data: oldRow } = await supabase
                    .from('assets')
                    .select('*')
                    .eq('id', id)
                    .limit(1)
                    .single();

                if (oldRow) {
                    await supabase.from('assets').insert({ ...oldRow, id: newId });
                    await supabase.from('assets').delete().eq('id', id).limit(1);
                    fixes++;
                }
            }
        }



        return NextResponse.json({ success: true, fixes });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
