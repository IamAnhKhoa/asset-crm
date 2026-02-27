import { getSheetValues, appendSheetRow, updateSheetRow, deleteSheetRow, SHEET_NAMES, formatDateTime, parseViDate } from './sheets';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationMsg {
    id: string;
    content: string;
    startDate: string; // dd/MM/yyyy HH:mm
    endDate: string; // dd/MM/yyyy HH:mm
    isBold: boolean;
    highlightColor: string;
    textColor: string;
    isActive: boolean;
}

export async function getAllNotifications(): Promise<NotificationMsg[]> {
    try {
        const rows = await getSheetValues(SHEET_NAMES.NOTIFICATIONS);
        if (!rows || rows.length <= 1) return []; // Skip header

        return rows.slice(1).map((row) => ({
            id: row[0] || '',
            content: row[1] || '',
            startDate: row[2] || '',
            endDate: row[3] || '',
            isBold: (row[4] || '').toUpperCase() === 'TRUE',
            highlightColor: row[5] || '',
            textColor: row[6] || '',
            isActive: (row[7] || '').toUpperCase() !== 'FALSE', // Default string or 'TRUE' is active
        })).filter(n => n.id);
    } catch (e: any) {
        // If sheet doesn't exist, ignore and return empty (or log)
        console.warn('Could not fetch notifications:', e.message);
        return [];
    }
}

export async function addNotification(n: Omit<NotificationMsg, 'id'>): Promise<NotificationMsg> {
    const id = uuidv4();
    await appendSheetRow(SHEET_NAMES.NOTIFICATIONS, [
        id,
        n.content,
        n.startDate,
        n.endDate,
        n.isBold ? 'TRUE' : 'FALSE',
        n.highlightColor,
        n.textColor,
        n.isActive ? 'TRUE' : 'FALSE'
    ]);
    return { ...n, id };
}

export async function updateNotification(n: NotificationMsg): Promise<void> {
    const rows = await getSheetValues(SHEET_NAMES.NOTIFICATIONS);
    const rowIndex = rows.findIndex(row => row[0] === n.id);

    if (rowIndex === -1) throw new Error('Notification not found');

    // rowIndex is 0-based. Plus 1 because Google Sheets is 1-based index (e.g Row 1 is header, Row 2 is first param).
    // So if rowIndex was 1 (the first data row), the actual sheet row is 2.
    // wait, getSheetValues returns all rows including header (row 0). 
    // So rowIndex matches exactly the 0-based index. In Google Sheets it's 1-based, so row = rowIndex + 1.
    await updateSheetRow(SHEET_NAMES.NOTIFICATIONS, rowIndex + 1, 1, [
        n.id,
        n.content,
        n.startDate,
        n.endDate,
        n.isBold ? 'TRUE' : 'FALSE',
        n.highlightColor,
        n.textColor,
        n.isActive ? 'TRUE' : 'FALSE'
    ]);
}

export async function deleteNotification(id: string): Promise<void> {
    const rows = await getSheetValues(SHEET_NAMES.NOTIFICATIONS);
    const rowIndex = rows.findIndex(row => row[0] === id);

    if (rowIndex === -1) throw new Error('Notification not found');

    await deleteSheetRow(SHEET_NAMES.NOTIFICATIONS, rowIndex + 1);
}

// Lấy những thông báo ĐANG CÓ HIỆU LỰC ở hiện tại
export async function getActiveNotifications(): Promise<NotificationMsg[]> {
    const all = await getAllNotifications();
    const now = new Date();

    return all.filter(n => {
        if (!n.isActive) return false;

        let start = null;
        let end = null;

        // Start date condition
        if (n.startDate && n.startDate !== '—' && n.startDate.trim() !== '') {
            start = parseViDate(n.startDate);
        }

        // End date condition
        if (n.endDate && n.endDate !== '—' && n.endDate.trim() !== '') {
            end = parseViDate(n.endDate);
        }

        // Logical check
        if (start && now < start) return false; // Chưa tới giờ chiếu
        if (end && now > end) return false;     // Đã hết giờ chiếu

        return true;
    });
}
