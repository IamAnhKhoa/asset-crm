import { Asset } from '@/types';
import {
    getSheetValues,
    appendSheetRow,
    updateSheetCell,
    deleteSheetRow,
    SHEET_NAMES,
} from './sheets';

function rowToAsset(row: string[], rowIndex: number): Asset {
    return {
        id: row[0] || '',
        name: row[1] || '',
        location: row[2] || '',
        year: row[3] || '',
        status: row[4] || '',
        person: row[5] || '',
        specificLocation: row[6] || '',
        originalPrice: row[7] ? (String(row[7]).replace(/[^0-9]/g, '') ? Number(String(row[7]).replace(/[^0-9]/g, '')) : undefined) : undefined,
        row: rowIndex,
    };
}

import { canViewAsset } from './auth';
import { UserContext } from '@/types';

export async function getAllAssets(userCtx?: UserContext): Promise<Asset[]> {
    const data = await getSheetValues(SHEET_NAMES.ASSETS);
    const result: Asset[] = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
            const asset = rowToAsset(data[i], i + 1);
            if (!userCtx || canViewAsset(userCtx, asset)) {
                result.push(asset);
            }
        }
    }
    return result;
}

export async function getAssetById(assetId: string): Promise<Asset | null> {
    const data = await getSheetValues(SHEET_NAMES.ASSETS);
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim() === String(assetId).trim()) {
            return rowToAsset(data[i], i + 1);
        }
    }
    return null;
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
        // Find next suffix
        let counter = 1;
        while (true) {
            const nextId = `${finalId} (${counter})`;
            const check = await getAssetById(nextId);
            if (!check) {
                finalId = nextId;
                break;
            }
            counter++;
            if (counter > 100) break; // safety
        }
    }

    await appendSheetRow(SHEET_NAMES.ASSETS, [
        finalId,
        data.name,
        data.location,
        data.year,
        data.status || 'Đang sử dụng',
        data.person || '',
        data.specificLocation || '',
        data.originalPrice ? String(data.originalPrice) : '',
    ]);
    return { success: true, message: existing ? `Đã thêm tài sản mới với mã ${finalId} (do trùng mã gốc)` : 'Đã thêm tài sản mới!', assetId: finalId };
}

export async function updateAsset(
    assetId: string,
    data: Partial<Omit<Asset, 'id' | 'row'>>
): Promise<{ success: boolean; message: string }> {
    const sheetData = await getSheetValues(SHEET_NAMES.ASSETS);
    for (let i = 1; i < sheetData.length; i++) {
        if (String(sheetData[i][0]).trim() === String(assetId).trim()) {
            const rowNum = i + 1;
            if (data.name !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 2, data.name);
            if (data.location !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 3, data.location);
            if (data.year !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 4, String(data.year));
            if (data.status !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 5, data.status);
            if (data.person !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 6, data.person);
            if (data.specificLocation !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 7, data.specificLocation);
            if (data.originalPrice !== undefined) await updateSheetCell(SHEET_NAMES.ASSETS, rowNum, 8, data.originalPrice === null ? '' : String(data.originalPrice));
            return { success: true, message: 'Đã cập nhật tài sản!' };
        }
    }
    return { success: false, message: 'Không tìm thấy tài sản!' };
}

export async function deleteAsset(
    assetId: string
): Promise<{ success: boolean; message: string }> {
    const sheetData = await getSheetValues(SHEET_NAMES.ASSETS);
    for (let i = 1; i < sheetData.length; i++) {
        if (String(sheetData[i][0]).trim() === String(assetId).trim()) {
            await deleteSheetRow(SHEET_NAMES.ASSETS, i + 1);
            return { success: true, message: 'Đã xóa tài sản!' };
        }
    }
    return { success: false, message: 'Không tìm thấy tài sản!' };
}

export async function updateAssetStatus(assetId: string, status: string) {
    const sheetData = await getSheetValues(SHEET_NAMES.ASSETS);
    for (let i = 1; i < sheetData.length; i++) {
        if (String(sheetData[i][0]).trim() === String(assetId).trim()) {
            await updateSheetCell(SHEET_NAMES.ASSETS, i + 1, 5, status);
            return;
        }
    }
}

export async function getAssetLocation(assetId: string): Promise<string> {
    const asset = await getAssetById(assetId);
    return asset?.location || '';
}

export async function getDepartments(): Promise<string[]> {
    const all = await getAllAssets();
    const depts = [...new Set(all.map((a) => a.location).filter(Boolean))];
    return depts.sort();
}
