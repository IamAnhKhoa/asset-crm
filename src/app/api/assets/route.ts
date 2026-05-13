import { NextRequest, NextResponse } from 'next/server';
import { getAllAssets, searchAssets, createAsset } from '@/lib/assets';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { UserContext } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if ((session.user as any).role === 'guest') {
            return NextResponse.json({ error: 'Bạn không có quyền xem tài sản' }, { status: 403 });
        }

        const userCtx: UserContext = {
            role: (session.user as any).role || 'user_basic',
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const { searchParams } = new URL(req.url);
        const q = searchParams.get('q');

        const assets = q ? await searchAssets(q, userCtx) : await getAllAssets(userCtx);
        return NextResponse.json(assets);
    } catch (e: any) {
        console.error('[API Assets] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to fetch assets",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const userCtx: UserContext = {
            role: (session.user as any).role || 'user_basic',
            phongBan: (session.user as any).phongBan,
            tenChon: (session.user as any).tenChon,
        };

        const body = await req.json();
        const { id, name, location, year, quantity, status, person, specificLocation, oldLocation } = body;

        const role = userCtx.role;
        if (role === 'user_basic' || role === 'guest') {
            return NextResponse.json({ error: 'Bạn không có quyền thêm mới tài sản' }, { status: 403 });
        }

        if (role === 'admin_dept') {
            const { DEPARTMENT_NAMES } = await import('@/lib/employees');
            const userDeptName = userCtx.phongBan ? (DEPARTMENT_NAMES[userCtx.phongBan] || userCtx.phongBan) : '';
            if (location !== userDeptName) {
                return NextResponse.json({ error: `Bạn chỉ có quyền thêm tài sản cho phòng ${userDeptName}` }, { status: 403 });
            }
        }

        if (!id || !name) {
            return NextResponse.json({ error: 'Mã và Tên tài sản là bắt buộc' }, { status: 400 });
        }
        const result = await createAsset({ id, name, location, year, quantity: Number(quantity) || 1, status, person, specificLocation, oldLocation });
        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (e: any) {
        console.error('[API Assets] Fatal error:', e);
        return NextResponse.json({
            error: "Failed to create asset",
            detail: e?.message || String(e)
        }, { status: 500 });
    }
}
