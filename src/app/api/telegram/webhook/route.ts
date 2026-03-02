import { NextRequest, NextResponse } from 'next/server';
import { approveRepair, rejectRepair, approveCheck, rejectCheck, updateRepairHistory } from '@/lib/history';
import { getAssetById } from '@/lib/assets';
import { purgeCache, purgePattern } from '@/lib/kv-cache';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8518632582:AAGPiuljJN5xEPCf7_QKVOaCG5IyVPZvuGg'; // fallback to hardcoded if env missing

// Simple in-memory cache for webhook deduplication
const processedUpdates = new Set<number>();

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Webhook Deduplication (Chống kẹt hàng chờ)
        if (body.update_id) {
            if (processedUpdates.has(body.update_id)) {
                return NextResponse.json({ ok: true }); // Already processed
            }
            processedUpdates.add(body.update_id);
            // Keep set size manageable
            if (processedUpdates.size > 2000) {
                const arr = Array.from(processedUpdates);
                processedUpdates.delete(arr[0]);
            }
        }

        console.log('Telegram Webhook received body:', JSON.stringify(body, null, 2));

        // 2. Handle Text Commands (Hỗ trợ lệnh Text trực tiếp)
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const text = body.message.text.trim();

            if (text.startsWith('/start') || text.startsWith('/help')) {
                const helpText = `👋 <b>Chào mừng bạn đến với Quản Lý Tài Sản Bot!</b>\n\n` +
                    `Bạn có thể sử dụng các lệnh sau:\n` +
                    `🔎 <code>/search [Mã Máy]</code>: Tra cứu thông tin máy nhanh\n\n` +
                    `<i>Mẹo: Bạn cũng có khối trực tiếp mã tài sản (vd: T03... vào đây để tìm).</i>`;
                await sendTelegramMessageDirect(chatId, helpText);
            }
            else if (text.startsWith('/search ') || text.startsWith('/find ') || text.match(/^T03[0-9A-Z-]*$/i)) {
                let assetId = text.replace(/^\/(search|find)\s+/i, '').trim();
                const asset = await getAssetById(assetId);

                if (!asset) {
                    await sendTelegramMessageDirect(chatId, `❌ Không tìm thấy tài sản với mã: <b>${assetId}</b>`);
                } else {
                    const infoText = `📱 <b>Thông tin máy: ${asset.name}</b>\n\n` +
                        `🔹 <b>Mã TS:</b> <code>${asset.id}</code>\n` +
                        `🔹 <b>Trạng thái:</b> ${asset.status}\n` +
                        `🔹 <b>Người quản lý:</b> ${asset.person || 'Chưa bàn giao'}\n` +
                        `🔹 <b>Khu vực:</b> ${asset.location}\n` +
                        (asset.specificLocation ? `🔹 <b>Vị trí cụ thể:</b> ${asset.specificLocation}\n` : '') +
                        `\n👉 <i>Để sử dụng đầy đủ tính năng Báo hỏng hoặc Kiểm kê nhanh, vui lòng mở trang quản lý.</i>`;

                    const markup = {
                        inline_keyboard: [
                            [
                                { text: '🛠 Báo Hỏng / Kiểm Kê (Mở Web App)', url: `https://qlts-tah.vercel.app/lookup/${encodeURIComponent(asset.id)}` }
                            ]
                        ]
                    };
                    await sendTelegramMessageDirect(chatId, infoText, markup);
                }
            }
        }

        // 3. Handle Inline Keyboard Callbacks
        if (body.callback_query) {
            const callbackQuery = body.callback_query;
            const data = callbackQuery.data; // e.g. "approve_15" or "reject_15"
            const message = callbackQuery.message;
            const chatId = message?.chat?.id;
            const messageId = message?.message_id;

            if (!data || !chatId || !messageId) return NextResponse.json({ ok: true });

            // QUICK UX: Acknowledge the callback query IMMEDIATELY
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: callbackQuery.id }),
            }).catch(console.error);

            console.log('Processing callback query:', { data, chatId, messageId });

            if (data.startsWith('approve_')) {
                const rowIndex = parseInt(data.replace('approve_', ''), 10);
                if (!isNaN(rowIndex)) {
                    console.log('Approving repair for rowIndex:', rowIndex);
                    const res = await approveRepair(rowIndex, {
                        repairStatus: 'Đang xử lý',
                        result: 'Chưa hoàn thành',
                        handlerNote: 'Duyệt nhanh qua Telegram'
                    });
                    console.log('Approve result:', JSON.stringify(res));

                    // Invalidate cache
                    const assetId = (res as any).assetId;
                    await Promise.all([
                        purgePattern('history:repairs'),
                        purgeCache('dashboard'),
                        assetId ? purgeCache(`lookup:${assetId}`) : Promise.resolve()
                    ]).catch(e => console.warn('[Telegram Webhook] Cache purge failed:', e));

                    const newMarkup = res.historyRowIndex ? {
                        inline_keyboard: [
                            [{ text: '🛠 Đang sửa chữa', callback_data: `st_dangsua_${res.historyRowIndex}` }],
                            [{ text: '🚚 Đã giao đơn vị ngoài xử lý', callback_data: `st_giaongoai_${res.historyRowIndex}` }],
                            [{ text: '📦 Cần mua vật tư/linh kiện', callback_data: `st_canmua_${res.historyRowIndex}` }],
                            [{ text: '✅ Đã sửa xong', callback_data: `st_dasuaxong_${res.historyRowIndex}` }],
                            [{ text: '❌ Không thể sửa chữa', callback_data: `st_khongthesua_${res.historyRowIndex}` }]
                        ]
                    } : { inline_keyboard: [] };
                    await updateTelegramMessage(chatId, messageId, message.text + '\n\n✅ <i>Đã duyệt phiếu (Đang xử lý). Chọn trạng thái sửa chữa:</i>', newMarkup);
                }
            } else if (data.startsWith('st_')) {
                const parts = data.split('_');
                const statusKey = parts[1];
                const historyRowIndex = parseInt(parts[2], 10);

                if (!isNaN(historyRowIndex)) {
                    const statusMap: Record<string, string> = {
                        'dangsua': 'Đang sửa chữa', 'giaongoai': 'Đã giao đơn vị ngoài xử lý',
                        'canmua': 'Cần mua vật tư/linh kiện', 'dasuaxong': 'Đã sửa xong',
                        'khongthesua': 'Không thể sửa chữa',
                    };
                    const repairStatus = statusMap[statusKey] || 'Đang sửa chữa';
                    const resultsMarkup = {
                        inline_keyboard: [
                            [{ text: '✔️ Sửa chữa thành công', callback_data: `rs_thanhcong_${historyRowIndex}_${statusKey}` }],
                            [{ text: '⚠️ Sửa chữa tạm thời', callback_data: `rs_tamthoi_${historyRowIndex}_${statusKey}` }],
                            [{ text: '⏳ Chưa hoàn thành', callback_data: `rs_chuahoanthanh_${historyRowIndex}_${statusKey}` }],
                            [{ text: '❌ Không thể sửa chữa & Đề xuất thanh lý', callback_data: `rs_thanhly_${historyRowIndex}_${statusKey}` }],
                        ]
                    };
                    await updateTelegramMessage(chatId, messageId, message.text + `\n\nBạn đã chọn: <b>${repairStatus}</b>. Vui lòng chọn kết quả:`, resultsMarkup);
                }
            } else if (data.startsWith('rs_')) {
                const parts = data.split('_');
                const resultKey = parts[1];
                const historyRowIndex = parseInt(parts[2], 10);
                const statusKey = parts[3];

                if (!isNaN(historyRowIndex)) {
                    const statusMap: Record<string, string> = {
                        'dangsua': 'Đang sửa chữa', 'giaongoai': 'Đã giao đơn vị ngoài xử lý',
                        'canmua': 'Cần mua vật tư/linh kiện', 'dasuaxong': 'Đã sửa xong',
                        'khongthesua': 'Không thể sửa chữa',
                    };
                    const resultMap: Record<string, string> = {
                        'thanhcong': 'Sửa chữa thành công', 'tamthoi': 'Sửa chữa tạm thời',
                        'chuahoanthanh': 'Chưa hoàn thành', 'thanhly': 'Không thể sửa chữa & Đề xuất thanh lý',
                    };
                    const repairStatus = statusMap[statusKey] || 'Đang xử lý';
                    const result = resultMap[resultKey] || 'Chưa hoàn thành';

                    await updateRepairHistory(historyRowIndex, {
                        repairStatus,
                        result,
                        handlerNote: 'Cập nhật qua Telegram'
                    });

                    // Invalidate cache
                    await Promise.all([
                        purgePattern('history:repairs'),
                        purgeCache('dashboard')
                    ]).catch(e => console.warn('[Telegram Webhook] Cache purge failed:', e));

                    await updateTelegramMessage(chatId, messageId, message.text + `\n\n🎉 <i>Đã cập nhật: ${repairStatus} - ${result}</i>`, { inline_keyboard: [] });
                }
            } else if (data.startsWith('reject_')) {
                const rowIndex = parseInt(data.replace('reject_', ''), 10);
                if (!isNaN(rowIndex)) {
                    await rejectRepair(rowIndex, 'Từ chối nhanh qua Telegram');
                    await Promise.all([
                        purgePattern('history:repairs'),
                        purgeCache('dashboard')
                    ]).catch(e => console.warn('[Telegram Webhook] Cache purge failed:', e));
                    await updateTelegramMessage(chatId, messageId, message.text + '\n\n❌ <i>Đã từ chối phiếu sửa chữa</i>', { inline_keyboard: [] });
                }
            } else if (data.startsWith('apvchk_')) {
                const rowIndex = parseInt(data.replace('apvchk_', ''), 10);
                if (!isNaN(rowIndex)) {
                    await approveCheck(rowIndex);
                    await Promise.all([
                        purgePattern('history:checks'),
                        purgeCache('dashboard')
                    ]).catch(e => console.warn('[Telegram Webhook] Cache purge failed:', e));
                    await updateTelegramMessage(chatId, messageId, message.text + '\n\n✅ <i>Đã được duyệt báo cáo kiểm kê</i>', { inline_keyboard: [] });
                }
            } else if (data.startsWith('rejchk_')) {
                const rowIndex = parseInt(data.replace('rejchk_', ''), 10);
                if (!isNaN(rowIndex)) {
                    await rejectCheck(rowIndex, 'Từ chối nhanh từ Telegram');
                    await Promise.all([
                        purgePattern('history:checks'),
                        purgeCache('dashboard')
                    ]).catch(e => console.warn('[Telegram Webhook] Cache purge failed:', e));
                    await updateTelegramMessage(chatId, messageId, message.text + '\n\n❌ <i>Đã từ chối báo cáo kiểm kê</i>', { inline_keyboard: [] });
                }
            }
        }
    }

return NextResponse.json({ ok: true });
} catch (e: any) {
    console.error('Telegram Webhook error:', e);
    // Still return 200 to Telegram to stop retries if it's a code error, 
    // but log it for us.
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 200 });
}
}

async function sendTelegramMessageDirect(chatId: number, text: string, replyMarkup?: any) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            }),
        });
    } catch (error) {
        console.error('Failed to send direct message:', error);
    }
}

async function updateTelegramMessage(chatId: number, messageId: number, newText: string, replyMarkup?: any) {
    try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: newText,
                parse_mode: 'HTML',
                reply_markup: replyMarkup || { inline_keyboard: [] }
            }),
        });
    } catch (error) {
        console.error('Failed to update message:', error);
    }
}
