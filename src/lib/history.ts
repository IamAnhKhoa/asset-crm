import { CheckReport, RepairTicket, ApproveRepairData } from '@/types';
import {
    getSheetValues,
    appendSheetRow,
    updateSheetCell,
    updateSheetRow,
    deleteSheetRow,
    SHEET_NAMES,
    formatDateTime,
} from './sheets';
import { updateAssetStatus, getAllAssets } from './assets';
import { sendTelegramMessage } from './telegram';
import { UserContext } from '@/types';

// =========================
//  HISTORY – KIỂM KÊ
// =========================
export async function getCheckHistory(assetId?: string, userCtx?: UserContext): Promise<CheckReport[]> {
    let allowedAssetIds: Set<string> | null = null;
    if (userCtx && userCtx.role !== 'admin_full' && userCtx.role !== 'admin_holder') {
        if (userCtx.role === 'guest' && assetId) {
            allowedAssetIds = new Set([String(assetId).trim()]);
        } else {
            const allowedAssets = await getAllAssets(userCtx);
            allowedAssetIds = new Set(allowedAssets.map(a => String(a.id).trim()));
        }
    }

    const data = await getSheetValues(SHEET_NAMES.HISTORY_CHECK);
    const result: CheckReport[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const rowAssetId = String(row[1]).trim();
        if (assetId && rowAssetId !== String(assetId).trim()) continue;
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        result.push({
            row: i + 1,
            time: row[0] || '',
            assetId: row[1] || '',
            reporter: row[2] || '',
            status: row[3] || '',
            note: row[4] || '',
        });
    }
    return result;
}

// =========================
//  HISTORY – SỬA CHỮA
// =========================
export async function getRepairHistory(assetId?: string, userCtx?: UserContext): Promise<RepairTicket[]> {
    let allowedAssetIds: Set<string> | null = null;
    if (userCtx && userCtx.role !== 'admin_full' && userCtx.role !== 'admin_holder') {
        if (userCtx.role === 'guest' && assetId) {
            allowedAssetIds = new Set([String(assetId).trim()]);
        } else {
            const allowedAssets = await getAllAssets(userCtx);
            allowedAssetIds = new Set(allowedAssets.map(a => String(a.id).trim()));
        }
    }

    const data = await getSheetValues(SHEET_NAMES.HISTORY_REPAIR);
    const result: RepairTicket[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const rowAssetId = String(row[1]).trim();
        if (assetId && rowAssetId !== String(assetId).trim()) continue;
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        result.push({
            source: 'history',
            row: i + 1,
            time: row[0] || '',
            assetId: row[1] || '',
            person: row[2] || '',
            issue: row[3] || '',
            note: row[4] || '',
            approveStatus: row[5] || '',
            repairStatus: row[6] || '',
            result: row[7] || '',
            handlerNote: row[8] || '',
            updatedTime: row[9] || '',
            location: row[10] || '',
        });
    }
    return result;
}


// =========================
//  PENDING – KIỂM KÊ
// =========================
export async function getPendingChecks(userCtx?: UserContext): Promise<CheckReport[]> {
    let allowedAssetIds: Set<string> | null = null;
    if (userCtx && userCtx.role !== 'admin_full' && userCtx.role !== 'admin_holder') {
        if (userCtx.role === 'guest') {
            // Guests can't list ALL pending checks normally, but the Lookup API filters it.
            // We'll allow it here so the filter works.
            return (await getSheetValues(SHEET_NAMES.PENDING_CHECK))
                .slice(1)
                .filter(row => String(row[5]) === 'Chờ duyệt')
                .map((row, i) => ({
                    row: i + 2,
                    time: row[0] || '',
                    assetId: row[1] || '',
                    reporter: row[2] || '',
                    status: row[3] || '',
                    note: row[4] || '',
                    approveStatus: row[5] || '',
                    location: row[6] || '',
                }));
        }
        const allowedAssets = await getAllAssets(userCtx);
        allowedAssetIds = new Set(allowedAssets.map(a => String(a.id).trim()));
    }

    const data = await getSheetValues(SHEET_NAMES.PENDING_CHECK);
    if (data.length <= 1) return [];
    const result: CheckReport[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const rowAssetId = String(row[1]).trim();
        if (String(row[5]) !== 'Chờ duyệt') continue;
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        if (String(row[5]) !== 'Chờ duyệt') continue;
        result.push({
            row: i + 1,
            time: row[0] || '',
            assetId: row[1] || '',
            reporter: row[2] || '',
            status: row[3] || '',
            note: row[4] || '',
            approveStatus: row[5] || '',
            location: row[6] || '',
        });
    }
    return result;
}

export async function createCheckReport(data: {
    assetId: string;
    reporter: string;
    status: string;
    note: string;
    location: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        // Ensure header
        const current = await getSheetValues(SHEET_NAMES.PENDING_CHECK);
        if (current.length === 0) {
            await appendSheetRow(SHEET_NAMES.PENDING_CHECK, [
                'Thời gian', 'Mã TS', 'Người kiểm', 'Trạng thái', 'Ghi chú', 'Trạng thái duyệt', 'Vị trí',
            ]);
        }
        const rowIndex = await appendSheetRow(SHEET_NAMES.PENDING_CHECK, [
            formatDateTime(new Date()), data.assetId, data.reporter,
            data.status, data.note, 'Chờ duyệt', data.location,
        ]);

        const message = `📋 <b>CÓ PHIẾU KIỂM KÊ MỚI!</b>\n\n` +
            `📍 <b>Máy:</b> ${data.assetId}\n` +
            `👤 <b>Người kiểm:</b> ${data.reporter}\n` +
            `📊 <b>Trạng thái:</b> ${data.status}\n` +
            `📝 <b>Ghi chú:</b> ${data.note || 'Không có'}\n` +
            `🏢 <b>Vị trí:</b> ${data.location || 'Không xác định'}`;

        const markup = rowIndex > 0 ? {
            inline_keyboard: [
                [
                    { text: '✅ Duyệt Phiếu', callback_data: `apvchk_${rowIndex}` },
                    { text: '❌ Từ Chối', callback_data: `rejchk_${rowIndex}` }
                ]
            ]
        } : undefined;

        await sendTelegramMessage(message, markup).catch(console.error);

        return { success: true, message: 'Đã gửi báo cáo kiểm kê!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function approveCheck(
    rowIndex: number,
    assetId?: string,
    status?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const pendingData = await getSheetValues(SHEET_NAMES.PENDING_CHECK);
        const row = pendingData[rowIndex - 1];

        const finalAssetId = assetId || String(row[1] || '').trim();
        const finalStatus = status || String(row[3] || '').trim();

        // Ghi vào lịch sử kiểm kê
        await appendSheetRow(SHEET_NAMES.HISTORY_CHECK, [
            row[0], row[1], row[2], row[3], row[4],
        ]);
        // Cập nhật trạng thái tài sản
        if (finalAssetId && finalStatus) {
            await updateAssetStatus(finalAssetId, finalStatus);
        }
        // Đánh dấu đã duyệt
        await updateSheetCell(SHEET_NAMES.PENDING_CHECK, rowIndex, 6, 'Đã duyệt');
        return { success: true, message: 'Đã duyệt kiểm kê!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function rejectCheck(
    rowIndex: number,
    reason: string
): Promise<{ success: boolean; message: string }> {
    try {
        const pendingData = await getSheetValues(SHEET_NAMES.PENDING_CHECK);
        const row = pendingData[rowIndex - 1];

        await updateSheetCell(SHEET_NAMES.PENDING_CHECK, rowIndex, 6, 'Từ chối: ' + reason);

        await appendSheetRow(SHEET_NAMES.HISTORY_CHECK, [
            row[0], row[1], row[2], 'Từ chối', reason,
        ]);

        return { success: true, message: 'Đã từ chối báo cáo kiểm kê!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

// =========================
//  PENDING – SỬA CHỮA
// =========================

export async function syncAssetStatusFromRepair(assetId: string, repairStatus: string, result?: string) {
    let newStatus = 'Đang sử dụng';

    if (result === 'Không sửa được') {
        newStatus = 'Hỏng';
    } else if (repairStatus === 'Đã sửa xong') {
        newStatus = 'Đang sử dụng';
    } else if (repairStatus === 'Đang xử lý' || repairStatus === 'Đã giao đơn vị ngoài xử lý') {
        newStatus = 'Đang sửa chữa';
    } else if (repairStatus === 'Chưa xử lý') {
        newStatus = 'Cần sửa';
    }

    await updateAssetStatus(assetId, newStatus);
}

export async function getPendingRepairs(userCtx?: UserContext): Promise<RepairTicket[]> {
    let allowedAssetIds: Set<string> | null = null;
    if (userCtx && userCtx.role !== 'admin_full' && userCtx.role !== 'admin_holder') {
        if (userCtx.role === 'guest') {
            return (await getSheetValues(SHEET_NAMES.PENDING_REPAIR))
                .slice(1)
                .filter(row => String(row[5]) === 'Chờ duyệt')
                .map((row, i) => ({
                    source: 'pending',
                    row: i + 2,
                    time: row[0] || '',
                    assetId: row[1] || '',
                    person: row[2] || '',
                    issue: row[3] || '',
                    note: row[4] || '',
                    approveStatus: row[5] || 'Chờ duyệt',
                    repairStatus: row[6] || 'Chưa xử lý',
                    result: row[7] || 'Chưa hoàn thành',
                    handlerNote: row[8] || '',
                    updatedTime: row[9] || '',
                    location: row[10] || '',
                }));
        }
        const allowedAssets = await getAllAssets(userCtx);
        allowedAssetIds = new Set(allowedAssets.map(a => String(a.id).trim()));
    }

    const data = await getSheetValues(SHEET_NAMES.PENDING_REPAIR);
    if (data.length <= 1) return [];
    const result: RepairTicket[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        const rowAssetId = String(row[1]).trim();
        if (String(row[5]) !== 'Chờ duyệt') continue;
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        if (String(row[5]) !== 'Chờ duyệt') continue;
        result.push({
            source: 'pending',
            row: i + 1,
            time: row[0] || '',
            assetId: row[1] || '',
            person: row[2] || '',
            issue: row[3] || '',
            note: row[4] || '',
            approveStatus: row[5] || 'Chờ duyệt',
            repairStatus: row[6] || 'Chưa xử lý',
            result: row[7] || 'Chưa hoàn thành',
            handlerNote: row[8] || '',
            updatedTime: row[9] || '',
            location: row[10] || '',
        });
    }
    return result;
}

export async function updateRepairHistory(
    rowIndex: number,
    data: ApproveRepairData
): Promise<{ success: boolean; message: string }> {
    try {
        await updateSheetCell(SHEET_NAMES.HISTORY_REPAIR, rowIndex, 7, data.repairStatus);
        await updateSheetCell(SHEET_NAMES.HISTORY_REPAIR, rowIndex, 8, data.result);
        await updateSheetCell(SHEET_NAMES.HISTORY_REPAIR, rowIndex, 9, data.handlerNote);
        await updateSheetCell(SHEET_NAMES.HISTORY_REPAIR, rowIndex, 10, formatDateTime(new Date()));

        // Extract assetId from the historical row
        const sheetData = await getSheetValues(SHEET_NAMES.HISTORY_REPAIR);
        const row = sheetData[rowIndex - 1];
        if (row && row[1]) {
            await syncAssetStatusFromRepair(row[1], data.repairStatus, data.result);
        }

        return { success: true, message: 'Đã cập nhật trạng thái sửa chữa!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function createRepairTicket(data: {
    assetId: string;
    reporter: string;
    issue: string;
    note: string;
    location: string;
}): Promise<{ success: boolean; message: string }> {
    try {
        const current = await getSheetValues(SHEET_NAMES.PENDING_REPAIR);
        if (current.length === 0) {
            await appendSheetRow(SHEET_NAMES.PENDING_REPAIR, [
                'Thời gian', 'Mã TS', 'Người báo', 'Nội dung lỗi', 'Ghi chú',
                'Trạng thái duyệt', 'Trạng thái sửa chữa', 'Kết quả', 'Ghi chú xử lý', 'Lần cập nhật', 'Vị trí',
            ]);
        }
        const rowIndex = await appendSheetRow(SHEET_NAMES.PENDING_REPAIR, [
            formatDateTime(new Date()), data.assetId, data.reporter,
            data.issue, data.note, 'Chờ duyệt', 'Chưa xử lý', 'Chưa hoàn thành', '', '', data.location,
        ]);

        await syncAssetStatusFromRepair(data.assetId, 'Chưa xử lý');

        // Send Telegram notification for new ticket
        const message = `🚨 <b>CÓ PHIẾU BÁO HỎNG MỚI!</b>\n\n` +
            `📍 <b>Máy:</b> ${data.assetId}\n` +
            `👤 <b>Người báo:</b> ${data.reporter}\n` +
            `⚠️ <b>Lỗi:</b> ${data.issue}\n` +
            `📝 <b>Ghi chú:</b> ${data.note || 'Không có'}\n` +
            `🏢 <b>Vị trí:</b> ${data.location || 'Không xác định'}`;

        const markup = rowIndex > 0 ? {
            inline_keyboard: [
                [
                    { text: '✅ Duyệt Phiếu', callback_data: `approve_${rowIndex}` },
                    { text: '❌ Từ Chối', callback_data: `reject_${rowIndex}` }
                ]
            ]
        } : undefined;

        await sendTelegramMessage(message, markup).catch(console.error);

        return { success: true, message: 'Đã gửi phiếu sửa chữa!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function approveRepair(
    rowIndex: number,
    data?: ApproveRepairData
): Promise<{ success: boolean; message: string; historyRowIndex?: number }> {
    try {
        const pendingData = await getSheetValues(SHEET_NAMES.PENDING_REPAIR);
        const row = pendingData[rowIndex - 1];

        const repairStatus = data?.repairStatus || 'Đang xử lý';
        const result = data?.result || 'Chưa hoàn thành';
        const handlerNote = data?.handlerNote || '';
        const updatedTime = formatDateTime(new Date());

        await updateSheetCell(SHEET_NAMES.PENDING_REPAIR, rowIndex, 6, 'Đã duyệt');
        const historyRowIndex = await appendSheetRow(SHEET_NAMES.HISTORY_REPAIR, [
            row[0], row[1], row[2], row[3], row[4],
            'Đã duyệt', repairStatus, result, handlerNote,
            updatedTime, row[10],
        ]);

        if (row && row[1]) {
            await syncAssetStatusFromRepair(row[1], repairStatus, result);
        }

        // We comment this Telegram send out, or remove it,
        // because we only want to reply directly to the inline keyboard via the Webhook,
        // OR let it notify a different channel if needed.
        // For now let's just not send the redundant message, as the webhook will edit the existing message.
        // Wait, what if it's approved from the Web App? Then we DO want to send a message.
        // Let's keep it, but it's a separate notification. 
        // We will just let the Webhook handle editing the old message.

        return { success: true, message: 'Đã duyệt phiếu sửa chữa!', historyRowIndex };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function rejectRepair(
    rowIndex: number,
    reason: string
): Promise<{ success: boolean; message: string }> {
    try {
        const pendingData = await getSheetValues(SHEET_NAMES.PENDING_REPAIR);
        const row = pendingData[rowIndex - 1];

        const updatedTime = formatDateTime(new Date());

        await updateSheetCell(SHEET_NAMES.PENDING_REPAIR, rowIndex, 6, 'Từ chối: ' + reason);
        await appendSheetRow(SHEET_NAMES.HISTORY_REPAIR, [
            row[0], row[1], row[2], row[3], row[4],
            'Từ chối', '', '', 'Lý do: ' + reason,
            updatedTime, row[10],
        ]);

        if (row && row[1]) {
            await updateAssetStatus(row[1], 'Đang sử dụng');
        }

        return { success: true, message: 'Đã từ chối phiếu sửa chữa!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function deletePendingRepair(
    rowIndex: number
): Promise<{ success: boolean; message: string }> {
    try {
        if (rowIndex <= 1) return { success: false, message: 'Không thể xóa hàng tiêu đề!' };
        await deleteSheetRow(SHEET_NAMES.PENDING_REPAIR, rowIndex);
        return { success: true, message: 'Đã xóa phiếu sửa chữa!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

// =========================
//  ALL REPAIR TICKETS (pending + history)
// =========================
export async function getAllRepairTickets(userCtx?: UserContext): Promise<RepairTicket[]> {
    const [pending, history, assets] = await Promise.all([
        getPendingRepairs(userCtx),
        getRepairHistory(undefined, userCtx),
        getAllAssets(userCtx),
    ]);

    // Create lookup map for asset names
    const assetMap = Object.fromEntries(assets.map(a => [a.id, a.name]));

    const mapName = (tickets: RepairTicket[]) =>
        tickets.map(t => ({ ...t, name: assetMap[t.assetId] || '' }));

    return [...mapName(pending), ...mapName(history)];
}

// =========================
//  PENDING COUNTS
// =========================
export async function getPendingCounts(userCtx?: UserContext): Promise<{ kiemke: number; suachua: number }> {
    const [checks, repairs] = await Promise.all([
        getPendingChecks(userCtx),
        getPendingRepairs(userCtx),
    ]);
    return { kiemke: checks.length, suachua: repairs.length };
}
