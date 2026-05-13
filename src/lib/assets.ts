import { Asset } from '@/types';
import { supabase } from './supabase';
import { formatDateTime } from './date-utils';

import { canViewAsset } from './auth';
import { UserContext } from '@/types';

export async function getAllAssets(userCtx?: UserContext): Promise<Asset[]> {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('id', { ascending: true });

    if (error) {
        console.error('[Assets] getAllAssets error:', error.message);
        return [];
    }

    const result: Asset[] = [];
    for (const row of (data || [])) {
        const asset = dbToAsset(row);
        if (!userCtx || canViewAsset(userCtx, asset)) {
            result.push(asset);
        }
    }
    return result;
}

export async function getAssetById(assetId: string): Promise<Asset | null> {
    const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', assetId.trim())
        .maybeSingle();

    if (error) {
        console.error('[Assets] getAssetById error:', error.message);
        return null;
    }
    if (!data) return null;
    return dbToAsset(data);
}

export async function searchAssets(keyword: string, userCtx?: UserContext): Promise<Asset[]> {
    const kw = keyword.toLowerCase();
    const all = await getAllAssets(userCtx);
    return all.filter(
        (a) =>
            a.id.toLowerCase().includes(kw) ||
            a.name.toLowerCase().includes(kw) ||
            a.location.toLowerCase().includes(kw)
    );
}

export async function createAsset(
    data: Omit<Asset, 'row'>
): Promise<{ success: boolean; message: string; assetId?: string }> {
    let finalId = data.id.trim();
    const existing = await getAssetById(finalId);

    if (existing) {
        let counter = 1;
        while (true) {
            const nextId = `${finalId} (${counter})`;
            const check = await getAssetById(nextId);
            if (!check) {
                finalId = nextId;
                break;
            }
            counter++;
            if (counter > 100) break;
        }
    }

    const specObj = { specificLocation: data.specificLocation || '', oldLocation: data.oldLocation || '' };
    const specStr = (specObj.specificLocation || specObj.oldLocation) ? JSON.stringify(specObj) : '';

    const { error } = await supabase.from('assets').insert({
        id: finalId,
        name: data.name,
        location: data.location,
        year: String(data.year || ''),
        quantity: data.quantity || 1,
        status: data.status || 'Đang sử dụng',
        person: data.person || '',
        specific_location: specStr,
        original_price: data.originalPrice || null,
        created_at: data.createdAt || new Date().toISOString(),
    });

    if (error) {
        console.error('[Assets] createAsset error:', error.message);
        return { success: false, message: 'Lỗi: ' + error.message };
    }

    return {
        success: true,
        message: existing ? `Đã thêm tài sản mới với mã ${finalId} (do trùng mã gốc)` : 'Đã thêm tài sản mới!',
        assetId: finalId,
    };
}

export async function updateAsset(
    assetId: string,
    data: Partial<Omit<Asset, 'id' | 'row'>>
): Promise<{ success: boolean; message: string }> {
    const updateData: Record<string, any> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.year !== undefined) updateData.year = String(data.year);
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.person !== undefined) updateData.person = data.person;
    if (data.specificLocation !== undefined || data.oldLocation !== undefined) {
        // Find existing to merge
        const existing = await getAssetById(assetId);
        const specObj = {
            specificLocation: data.specificLocation !== undefined ? data.specificLocation : (existing?.specificLocation || ''),
            oldLocation: data.oldLocation !== undefined ? data.oldLocation : (existing?.oldLocation || '')
        };
        updateData.specific_location = (specObj.specificLocation || specObj.oldLocation) ? JSON.stringify(specObj) : '';
    }

    if (data.originalPrice !== undefined) updateData.original_price = data.originalPrice === null ? null : data.originalPrice;

    if (Object.keys(updateData).length === 0) {
        return { success: true, message: 'Không có thay đổi' };
    }

    const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', assetId.trim());

    if (error) {
        console.error('[Assets] updateAsset error:', error.message);
        return { success: false, message: 'Lỗi: ' + error.message };
    }
    return { success: true, message: 'Đã cập nhật tài sản!' };
}

export async function deleteAsset(
    assetId: string
): Promise<{ success: boolean; message: string }> {
    const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId.trim());

    if (error) {
        console.error('[Assets] deleteAsset error:', error.message);
        return { success: false, message: 'Lỗi: ' + error.message };
    }
    return { success: true, message: 'Đã xóa tài sản!' };
}

export async function updateAssetStatus(assetId: string, status: string) {
    const { error } = await supabase
        .from('assets')
        .update({ status })
        .eq('id', assetId.trim());

    if (error) {
        console.error('[Assets] updateAssetStatus error:', error.message);
    }
}

export async function getAssetLocation(assetId: string): Promise<string> {
    const asset = await getAssetById(assetId);
    return asset?.location || '';
}

export async function getDepartments(): Promise<string[]> {
    const { data, error } = await supabase
        .from('assets')
        .select('location')
        .neq('location', '');

    if (error) {
        console.error('[Assets] getDepartments error:', error.message);
        return [];
    }

    const unique = [...new Set((data || []).map((r: any) => r.location).filter(Boolean))];
    return unique.sort();
}

// ── Helper: DB row → Asset interface ──
function dbToAsset(row: any): Asset {
    let specLocStr = row.specific_location || '';
    let oldLocStr = '';

    // Phân tích cú pháp nếu specific_location chứa JSON (cả nơi cũ và vị trí)
    if (specLocStr.startsWith('{"')) {
        try {
            const parsed = JSON.parse(specLocStr);
            specLocStr = parsed.specificLocation || '';
            oldLocStr = parsed.oldLocation || '';
        } catch (e) { }
    } else {
        // Fallback for old records: if it contains "Nơi cũ:", split it
        if (specLocStr.includes('[Nơi cũ:')) {
            const parts = specLocStr.split('[Nơi cũ:');
            specLocStr = parts[0].trim();
            oldLocStr = parts[1].replace(']', '').trim();
        }
    }

    return {
        id: row.id || '',
        name: row.name || '',
        location: row.location || '',
        year: row.year || '',
        quantity: row.quantity ?? 1,
        status: row.status || '',
        person: row.person || '',
        specificLocation: specLocStr,
        oldLocation: oldLocStr,
        originalPrice: row.original_price ? Number(row.original_price) : undefined,
        createdAt: row.created_at || '',
    };
}
