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
import { updateAssetStatus } from './assets';
import { sendTelegramMessage } from './telegram';

// =========================
//  HISTORY – KIỂM KÊ
// =========================
export async function getCheckHistory(assetId?: string): Promise<CheckReport[]> {
    const data = await getSheetValues(SHEET_NAMES.HISTORY_CHECK);
    const result: CheckReport[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        if (assetId && String(row[1]).trim() !== String(assetId).trim()) continue;
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
export async function getRepairHistory(assetId?: string): Promise<RepairTicket[]> {
    const data = await getSheetValues(SHEET_NAMES.HISTORY_REPAIR);
    const result: RepairTicket[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
        if (assetId && String(row[1]).trim() !== String(assetId).trim()) continue;
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
export async function getPendingChecks(): Promise<CheckReport[]> {
    const data = await getSheetValues(SHEET_NAMES.PENDING_CHECK);
    if (data.length <= 1) return [];
    const result: CheckReport[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
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
        await appendSheetRow(SHEET_NAMES.PENDING_CHECK, [
            formatDateTime(new Date()), data.assetId, data.reporter,
            data.status, data.note, 'Chờ duyệt', data.location,
        ]);
        return { success: true, message: 'Đã gửi báo cáo kiểm kê!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function approveCheck(
    rowIndex: number,
    assetId: string,
    status: string
): Promise<{ success: boolean; message: string }> {
    try {
        const pendingData = await getSheetValues(SHEET_NAMES.PENDING_CHECK);
        const row = pendingData[rowIndex - 1];
        // Ghi vào lịch sử kiểm kê
        await appendSheetRow(SHEET_NAMES.HISTORY_CHECK, [
            row[0], row[1], row[2], row[3], row[4],
        ]);
        // Cập nhật trạng thái tài sản
        await updateAssetStatus(assetId, status);
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

export async function getPendingRepairs(): Promise<RepairTicket[]> {
    const data = await getSheetValues(SHEET_NAMES.PENDING_REPAIR);
    if (data.length <= 1) return [];
    const result: RepairTicket[] = [];
    for (let i = data.length - 1; i >= 1; i--) {
        const row = data[i];
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
        await appendSheetRow(SHEET_NAMES.PENDING_REPAIR, [
            formatDateTime(new Date()), data.assetId, data.reporter,
            data.issue, data.note, 'Chờ duyệt', 'Chưa xử lý', 'Chưa hoàn thành', '', '', data.location,
        ]);

        await syncAssetStatusFromRepair(data.assetId, 'Chưa xử lý');

        // Send Telegram notification for new ticket
        const message = `🚨 CÓ PHIẾU BÁO HỎNG MỚI!\n\n` +
            `📍 Máy: ${data.assetId}\n` +
            `👤 Người báo: ${data.reporter}\n` +
            `⚠️ Lỗi: ${data.issue}\n` +
            `📝 Ghi chú: ${data.note || 'Không có'}\n` +
            `🏢 Vị trí: ${data.location || 'Không xác định'}`;

        await sendTelegramMessage(message).catch(console.error);

        return { success: true, message: 'Đã gửi phiếu sửa chữa!' };
    } catch (e) {
        return { success: false, message: 'Lỗi: ' + String(e) };
    }
}

export async function approveRepair(
    rowIndex: number,
    data?: ApproveRepairData
): Promise<{ success: boolean; message: string }> {
    try {
        const pendingData = await getSheetValues(SHEET_NAMES.PENDING_REPAIR);
        const row = pendingData[rowIndex - 1];

        const repairStatus = data?.repairStatus || 'Đang xử lý';
        const result = data?.result || 'Chưa hoàn thành';
        const handlerNote = data?.handlerNote || '';
        const updatedTime = formatDateTime(new Date());

        await updateSheetCell(SHEET_NAMES.PENDING_REPAIR, rowIndex, 6, 'Đã duyệt');
        await appendSheetRow(SHEET_NAMES.HISTORY_REPAIR, [
            row[0], row[1], row[2], row[3], row[4],
            'Đã duyệt', repairStatus, result, handlerNote,
            updatedTime, row[10],
        ]);

        if (row && row[1]) {
            await syncAssetStatusFromRepair(row[1], repairStatus, result);
        }

        // Send Telegram notification
        const message = `🛠 PHIẾU SỬA CHỮA ĐÃ DUYỆT\n\n` +
            `📍 Máy: ${row[1]}\n` +
            `👤 Người báo: ${row[2]}\n` +
            `⚠️ Lỗi: ${row[3]}\n` +
            `📈 Trạng thái sửa: ${repairStatus}\n` +
            `📝 Ghi chú xử lý: ${handlerNote || 'Không có'}\n` +
            `⏰ TG duyệt: ${updatedTime}`;

        await sendTelegramMessage(message).catch(console.error);

        return { success: true, message: 'Đã duyệt phiếu sửa chữa!' };
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
export async function getAllRepairTickets(): Promise<RepairTicket[]> {
    const [pending, history] = await Promise.all([
        getPendingRepairs(),
        getRepairHistory(),
    ]);
    return [...pending, ...history];
}

// =========================
//  PENDING COUNTS
// =========================
export async function getPendingCounts(): Promise<{ kiemke: number; suachua: number }> {
    const [checks, repairs] = await Promise.all([
        getPendingChecks(),
        getPendingRepairs(),
    ]);
    return { kiemke: checks.length, suachua: repairs.length };
}
