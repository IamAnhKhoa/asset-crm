import { CheckReport, RepairTicket, ApproveRepairData } from '@/types';
import { supabase } from './supabase';
import { formatDateTime } from './date-utils';
import { updateAssetStatus, getAllAssets } from './assets';
import { sendTelegramMessage, updateTelegramMessage, TELEGRAM_CHAT_ID } from './telegram';
import { UserContext } from '@/types';
import { kv } from '@vercel/kv';

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

    let query = supabase
        .from('check_history')
        .select('*')
        .order('time', { ascending: false });

    if (assetId) {
        query = query.eq('asset_id', assetId.trim());
    }

    const { data, error } = await query;
    if (error) {
        console.error('[History] getCheckHistory error:', error.message);
        return [];
    }

    const result: CheckReport[] = [];
    for (const row of (data || [])) {
        const rowAssetId = String(row.asset_id).trim();
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        result.push({
            row: row.id,
            time: row.time ? formatDateTime(new Date(row.time)) : '',
            assetId: row.asset_id || '',
            reporter: row.reporter || '',
            status: row.status || '',
            note: row.note || '',
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

    let query = supabase
        .from('repair_history')
        .select('*')
        .order('time', { ascending: false });

    if (assetId) {
        query = query.eq('asset_id', assetId.trim());
    }

    const { data, error } = await query;
    if (error) {
        console.error('[History] getRepairHistory error:', error.message);
        return [];
    }

    const result: RepairTicket[] = [];
    for (const row of (data || [])) {
        const rowAssetId = String(row.asset_id).trim();
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        result.push(dbToRepairTicket(row, 'history'));
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
            const { data } = await supabase
                .from('pending_checks')
                .select('*')
                .eq('approve_status', 'Chờ duyệt')
                .order('time', { ascending: false });
            return (data || []).map(row => ({
                row: row.id,
                time: row.time ? formatDateTime(new Date(row.time)) : '',
                assetId: row.asset_id || '',
                reporter: row.reporter || '',
                status: row.status || '',
                note: row.note || '',
                approveStatus: row.approve_status || '',
                location: row.location || '',
            }));
        }
        const allowedAssets = await getAllAssets(userCtx);
        allowedAssetIds = new Set(allowedAssets.map(a => String(a.id).trim()));
    }

    const { data, error } = await supabase
        .from('pending_checks')
        .select('*')
        .eq('approve_status', 'Chờ duyệt')
        .order('time', { ascending: false });

    if (error) {
        console.error('[History] getPendingChecks error:', error.message);
        return [];
    }

    const result: CheckReport[] = [];
    for (const row of (data || [])) {
        const rowAssetId = String(row.asset_id).trim();
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        result.push({
            row: row.id,
            time: row.time ? formatDateTime(new Date(row.time)) : '',
            assetId: row.asset_id || '',
            reporter: row.reporter || '',
            status: row.status || '',
            note: row.note || '',
            approveStatus: row.approve_status || '',
            location: row.location || '',
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
        const { data: inserted, error } = await supabase
            .from('pending_checks')
            .insert({
                time: new Date().toISOString(),
                asset_id: data.assetId,
                reporter: data.reporter,
                status: data.status,
                note: data.note,
                approve_status: 'Chờ duyệt',
                location: data.location,
            })
            .select('id')
            .single();

        if (error) throw error;

        const rowIndex = inserted?.id || 0;

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

        const messageId = await sendTelegramMessage(message, markup).catch(console.error);
        if (messageId && rowIndex > 0) {
            await kv.set(`tg_msg_check_pending_${rowIndex}`, messageId).catch(console.error);
        }

        return { success: true, message: 'Đã gửi báo cáo kiểm kê!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function approveCheck(
    rowIndex: number,
    assetId?: string,
    status?: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: row, error: fetchErr } = await supabase
            .from('pending_checks')
            .select('*')
            .eq('id', rowIndex)
            .single();

        if (fetchErr || !row) throw fetchErr || new Error('Row not found');

        const finalAssetId = assetId || String(row.asset_id || '').trim();
        const finalStatus = status || String(row.status || '').trim();

        // Ghi vào lịch sử kiểm kê
        await supabase.from('check_history').insert({
            time: row.time,
            asset_id: row.asset_id,
            reporter: row.reporter,
            status: row.status,
            note: row.note,
        });

        // Cập nhật trạng thái tài sản
        if (finalAssetId && finalStatus) {
            await updateAssetStatus(finalAssetId, finalStatus);
        }

        // Đồng bộ lên Telegram
        try {
            const messageId = await kv.get<number>(`tg_msg_check_pending_${rowIndex}`);
            if (messageId) {
                const newText = `📋 <b>CÓ PHIẾU KIỂM KÊ MỚI!</b>\n\n` +
                    `📍 <b>Máy:</b> ${row.asset_id}\n` +
                    `👤 <b>Người kiểm:</b> ${row.reporter}\n` +
                    `📊 <b>Trạng thái:</b> ${row.status}\n` +
                    `📝 <b>Ghi chú:</b> ${row.note || 'Không có'}\n\n` +
                    `✅ <i>Đã được duyệt báo cáo kiểm kê</i>`;
                await updateTelegramMessage(TELEGRAM_CHAT_ID, messageId, newText);
                await kv.del(`tg_msg_check_pending_${rowIndex}`);
            }
        } catch (err) {
            console.error('Failed to sync TG approveCheck', err);
        }

        // Xóa khỏi pending sau khi đã chuyển sang history
        await supabase
            .from('pending_checks')
            .delete()
            .eq('id', rowIndex);

        return { success: true, message: 'Đã duyệt kiểm kê!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function rejectCheck(
    rowIndex: number,
    reason: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: row, error: fetchErr } = await supabase
            .from('pending_checks')
            .select('*')
            .eq('id', rowIndex)
            .single();

        if (fetchErr || !row) throw fetchErr || new Error('Row not found');

        // Xóa khỏi pending sau khi đã chuyển sang history
        await supabase
            .from('pending_checks')
            .delete()
            .eq('id', rowIndex);

        await supabase.from('check_history').insert({
            time: row.time,
            asset_id: row.asset_id,
            reporter: row.reporter,
            status: 'Từ chối',
            note: reason,
        });

        // Đồng bộ lên Telegram
        try {
            const messageId = await kv.get<number>(`tg_msg_check_pending_${rowIndex}`);
            if (messageId) {
                const newText = `📋 <b>CÓ PHIẾU KIỂM KÊ MỚI!</b>\n\n` +
                    `📍 <b>Máy:</b> ${row.asset_id}\n` +
                    `👤 <b>Người kiểm:</b> ${row.reporter}\n` +
                    `📊 <b>Trạng thái:</b> ${row.status}\n` +
                    `📝 <b>Ghi chú:</b> ${row.note || 'Không có'}\n\n` +
                    `❌ <i>Đã từ chối báo cáo kiểm kê</i>`;
                await updateTelegramMessage(TELEGRAM_CHAT_ID, messageId, newText);
                await kv.del(`tg_msg_check_pending_${rowIndex}`);
            }
        } catch (err) {
            console.error('Failed to sync TG rejectCheck', err);
        }

        return { success: true, message: 'Đã từ chối báo cáo kiểm kê!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
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
    } else if (repairStatus === 'Đã giao đơn vị ngoài xử lý') {
        newStatus = 'Đã giao đơn vị ngoài xử lý';
    } else if (repairStatus === 'Đang xử lý') {
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
            const { data } = await supabase
                .from('pending_repairs')
                .select('*')
                .eq('approve_status', 'Chờ duyệt')
                .order('time', { ascending: false });
            return (data || []).map(row => dbToRepairTicket(row, 'pending'));
        }
        const allowedAssets = await getAllAssets(userCtx);
        allowedAssetIds = new Set(allowedAssets.map(a => String(a.id).trim()));
    }

    const { data, error } = await supabase
        .from('pending_repairs')
        .select('*')
        .eq('approve_status', 'Chờ duyệt')
        .order('time', { ascending: false });

    if (error) {
        console.error('[History] getPendingRepairs error:', error.message);
        return [];
    }

    const result: RepairTicket[] = [];
    for (const row of (data || [])) {
        const rowAssetId = String(row.asset_id).trim();
        if (allowedAssetIds && !allowedAssetIds.has(rowAssetId)) continue;
        result.push(dbToRepairTicket(row, 'pending'));
    }
    return result;
}

export async function updateRepairHistory(
    rowIndex: number,
    data: ApproveRepairData
): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase
            .from('repair_history')
            .update({
                repair_status: data.repairStatus,
                result: data.result,
                handler_note: data.handlerNote,
                updated_time: new Date().toISOString(),
            })
            .eq('id', rowIndex);

        if (error) throw error;

        // Extract full details from the historical row
        const { data: row } = await supabase
            .from('repair_history')
            .select('*')
            .eq('id', rowIndex)
            .single();

        if (row?.asset_id) {
            await syncAssetStatusFromRepair(row.asset_id, data.repairStatus, data.result);
        }

        // Đồng bộ lên Telegram
        try {
            const messageId = await kv.get<number>(`tg_msg_repair_history_${rowIndex}`);
            if (messageId && row) {
                const newText = `🚨 <b>CÓ PHIẾU BÁO HỎNG MỚI!</b>\n\n` +
                    `📍 <b>Máy:</b> ${row.asset_id}\n` +
                    `👤 <b>Người báo:</b> ${row.person}\n` +
                    `⚠️ <b>Lỗi:</b> ${row.issue}\n` +
                    `📝 <b>Ghi chú:</b> ${row.note || 'Không có'}\n` +
                    `🏢 <b>Vị trí:</b> ${row.location || 'Không xác định'}\n\n` +
                    `🎉 <i>Đã cập nhật: ${data.repairStatus} - ${data.result}</i>` +
                    (data.handlerNote ? `\n\n💬 <b>Ghi chú Xử Lý:</b> ${data.handlerNote}` : '');

                await updateTelegramMessage(TELEGRAM_CHAT_ID, messageId, newText, { inline_keyboard: [] });
            }
        } catch (err) {
            console.error('Failed to sync TG updateRepair', err);
        }

        return { success: true, message: 'Đã cập nhật trạng thái sửa chữa!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
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
        const { data: inserted, error } = await supabase
            .from('pending_repairs')
            .insert({
                time: new Date().toISOString(),
                asset_id: data.assetId,
                person: data.reporter,
                issue: data.issue,
                note: data.note,
                approve_status: 'Chờ duyệt',
                repair_status: 'Chưa xử lý',
                result: 'Chưa hoàn thành',
                handler_note: '',
                updated_time: null,
                location: data.location,
            })
            .select('id')
            .single();

        if (error) throw error;

        const rowIndex = inserted?.id || 0;

        await syncAssetStatusFromRepair(data.assetId, 'Chưa xử lý');

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

        const messageId = await sendTelegramMessage(message, markup).catch(console.error);
        if (messageId && rowIndex > 0) {
            await kv.set(`tg_msg_repair_pending_${rowIndex}`, messageId).catch(console.error);
        }

        return { success: true, message: 'Đã gửi phiếu sửa chữa!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function approveRepair(
    rowIndex: number,
    data?: ApproveRepairData
): Promise<{ success: boolean; message: string; historyRowIndex?: number }> {
    try {
        const { data: row, error: fetchErr } = await supabase
            .from('pending_repairs')
            .select('*')
            .eq('id', rowIndex)
            .single();

        if (fetchErr || !row) throw fetchErr || new Error('Row not found');

        const repairStatus = data?.repairStatus || 'Đang xử lý';
        const result = data?.result || 'Chưa hoàn thành';
        const handlerNote = data?.handlerNote || '';
        const updatedTime = new Date().toISOString();

        // Xóa khỏi pending sau khi chuyển sang history bên dưới

        const { data: historyRow, error: insertErr } = await supabase
            .from('repair_history')
            .insert({
                time: row.time,
                asset_id: row.asset_id,
                person: row.person,
                issue: row.issue,
                note: row.note,
                approve_status: 'Đã duyệt',
                repair_status: repairStatus,
                result: result,
                handler_note: handlerNote,
                updated_time: updatedTime,
                location: row.location,
            })
            .select('id')
            .single();

        if (insertErr) throw insertErr;

        // Xóa khỏi pending_repairs sau khi đã chuyển thành công sang history
        await supabase
            .from('pending_repairs')
            .delete()
            .eq('id', rowIndex);

        if (row.asset_id) {
            await syncAssetStatusFromRepair(row.asset_id, repairStatus, result);
        }

        // Đồng bộ lên Telegram
        try {
            const messageId = await kv.get<number>(`tg_msg_repair_pending_${rowIndex}`);
            if (messageId && historyRow?.id) {
                const newText = `🚨 <b>CÓ PHIẾU BÁO HỎNG MỚI!</b>\n\n` +
                    `📍 <b>Máy:</b> ${row.asset_id}\n` +
                    `👤 <b>Người báo:</b> ${row.person}\n` +
                    `⚠️ <b>Lỗi:</b> ${row.issue}\n` +
                    `📝 <b>Ghi chú:</b> ${row.note || 'Không có'}\n` +
                    `🏢 <b>Vị trí:</b> ${row.location || 'Không xác định'}\n\n` +
                    `✅ <i>Đã duyệt phiếu (Đang xử lý). Chọn trạng thái sửa chữa:</i>`;

                const newMarkup = {
                    inline_keyboard: [
                        [
                            { text: 'Đang sửa chữa', callback_data: `st_${historyRow.id}_Đang sửa chữa` },
                            { text: 'Đã giao ĐV ngoài xử lý', callback_data: `st_${historyRow.id}_Đã giao đơn vị ngoài xử lý` }
                        ]
                    ]
                };

                await updateTelegramMessage(TELEGRAM_CHAT_ID, messageId, newText, newMarkup);
                await kv.set(`tg_msg_repair_history_${historyRow.id}`, messageId);
                await kv.del(`tg_msg_repair_pending_${rowIndex}`);
            }
        } catch (err) {
            console.error('Failed to sync TG approveRepair', err);
        }

        return { success: true, message: 'Đã duyệt phiếu sửa chữa!', historyRowIndex: historyRow?.id };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function rejectRepair(
    rowIndex: number,
    reason: string
): Promise<{ success: boolean; message: string }> {
    try {
        const { data: row, error: fetchErr } = await supabase
            .from('pending_repairs')
            .select('*')
            .eq('id', rowIndex)
            .single();

        if (fetchErr || !row) throw fetchErr || new Error('Row not found');

        const updatedTime = new Date().toISOString();

        // Xóa khỏi pending sau khi đã chuyển sang history bên dưới

        await supabase.from('repair_history').insert({
            time: row.time,
            asset_id: row.asset_id,
            person: row.person,
            issue: row.issue,
            note: row.note,
            approve_status: 'Từ chối',
            repair_status: '',
            result: '',
            handler_note: 'Lý do: ' + reason,
            updated_time: updatedTime,
            location: row.location,
        });

        // Xóa khỏi pending_repairs sau khi đã chuyển sang history
        await supabase
            .from('pending_repairs')
            .delete()
            .eq('id', rowIndex);

        if (row.asset_id) {
            await updateAssetStatus(row.asset_id, 'Đang sử dụng');
        }

        // Đồng bộ lên Telegram
        try {
            const messageId = await kv.get<number>(`tg_msg_repair_pending_${rowIndex}`);
            if (messageId) {
                const newText = `🚨 <b>CÓ PHIẾU BÁO HỎNG MỚI!</b>\n\n` +
                    `📍 <b>Máy:</b> ${row.asset_id}\n` +
                    `👤 <b>Người báo:</b> ${row.person}\n` +
                    `⚠️ <b>Lỗi:</b> ${row.issue}\n` +
                    `📝 <b>Ghi chú:</b> ${row.note || 'Không có'}\n` +
                    `🏢 <b>Vị trí:</b> ${row.location || 'Không xác định'}\n\n` +
                    `❌ <i>Đã từ chối phiếu sửa chữa</i>`;
                await updateTelegramMessage(TELEGRAM_CHAT_ID, messageId, newText);
                await kv.del(`tg_msg_repair_pending_${rowIndex}`);
            }
        } catch (err) {
            console.error('Failed to sync TG rejectRepair', err);
        }

        return { success: true, message: 'Đã từ chối phiếu sửa chữa!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function deletePendingRepair(
    rowIndex: number
): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase
            .from('pending_repairs')
            .delete()
            .eq('id', rowIndex);

        if (error) throw error;
        return { success: true, message: 'Đã xóa phiếu sửa chữa!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function deletePendingCheck(
    rowIndex: number
): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase
            .from('pending_checks')
            .delete()
            .eq('id', rowIndex);

        if (error) throw error;
        return { success: true, message: 'Đã xóa phiếu kiểm kê!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

export async function deleteCheckHistory(
    rowIndex: number
): Promise<{ success: boolean; message: string }> {
    try {
        const { error } = await supabase
            .from('check_history')
            .delete()
            .eq('id', rowIndex);

        if (error) throw error;
        return { success: true, message: 'Đã xóa lịch sử kiểm kê!' };
    } catch (e: any) {
        return { success: false, message: 'Lỗi: ' + String(e.message || e) };
    }
}

// =========================
//  ALL REPAIR TICKETS (pending + history)
// =========================
export async function getAllRepairTickets(userCtx?: UserContext): Promise<RepairTicket[]> {
    const [pending, history, assets] = await Promise.all([
        getPendingRepairs(userCtx),
        getRepairHistory(undefined, userCtx),
        getAllAssets(userCtx), // Note: Future refactor could add a select param to getAllAssets if DB grows huge.
    ]);

    // O(N) mapping for asset names
    const assetMap: Record<string, string> = {};
    for (const a of assets) {
        assetMap[a.id] = a.name;
    }

    const mapName = (tickets: RepairTicket[]) => {
        const result = new Array(tickets.length);
        for (let i = 0; i < tickets.length; i++) {
            const t = tickets[i];
            result[i] = { ...t, name: assetMap[t.assetId] || '' };
        }
        return result;
    };

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

// ── Helper: DB row → RepairTicket ──
function dbToRepairTicket(row: any, source: 'pending' | 'history'): RepairTicket {
    return {
        source,
        row: row.id,
        time: row.time ? formatDateTime(new Date(row.time)) : '',
        assetId: row.asset_id || '',
        person: row.person || '',
        issue: row.issue || '',
        note: row.note || '',
        approveStatus: row.approve_status || '',
        repairStatus: row.repair_status || '',
        result: row.result || '',
        handlerNote: row.handler_note || '',
        updatedTime: row.updated_time ? formatDateTime(new Date(row.updated_time)) : '',
        location: row.location || '',
    };
}
