import { supabase } from './supabase';
import { formatDateTime, parseViDate } from './date-utils';

export interface NotificationMsg {
    id: string;
    content: string;
    startDate: string;
    endDate: string;
    isBold: boolean;
    highlightColor: string;
    textColor: string;
    isActive: boolean;
}

export async function getAllNotifications(): Promise<NotificationMsg[]> {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('start_date', { ascending: false });

        if (error) throw error;
        return (data || []).map(dbToNotification).filter(n => n.id);
    } catch (e: any) {
        console.warn('Could not fetch notifications:', e.message);
        return [];
    }
}

export async function addNotification(n: Omit<NotificationMsg, 'id'>): Promise<NotificationMsg> {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            content: n.content,
            start_date: n.startDate && n.startDate !== '—' ? parseViDate(n.startDate)?.toISOString() || null : null,
            end_date: n.endDate && n.endDate !== '—' ? parseViDate(n.endDate)?.toISOString() || null : null,
            is_bold: n.isBold,
            highlight_color: n.highlightColor,
            text_color: n.textColor,
            is_active: n.isActive,
        })
        .select()
        .single();

    if (error) throw error;
    return dbToNotification(data);
}

export async function updateNotification(n: NotificationMsg): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({
            content: n.content,
            start_date: n.startDate && n.startDate !== '—' ? parseViDate(n.startDate)?.toISOString() || null : null,
            end_date: n.endDate && n.endDate !== '—' ? parseViDate(n.endDate)?.toISOString() || null : null,
            is_bold: n.isBold,
            highlight_color: n.highlightColor,
            text_color: n.textColor,
            is_active: n.isActive,
        })
        .eq('id', n.id);

    if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

    if (error) throw error;
}

// Lấy những thông báo ĐANG CÓ HIỆU LỰC ở hiện tại
export async function getActiveNotifications(): Promise<NotificationMsg[]> {
    const all = await getAllNotifications();
    const now = new Date();

    return all.filter(n => {
        if (!n.isActive) return false;

        let start = null;
        let end = null;

        if (n.startDate && n.startDate !== '—' && n.startDate.trim() !== '') {
            start = parseViDate(n.startDate);
        }

        if (n.endDate && n.endDate !== '—' && n.endDate.trim() !== '') {
            end = parseViDate(n.endDate);
        }

        if (start && now < start) return false;
        if (end && now > end) return false;

        return true;
    });
}

function dbToNotification(row: any): NotificationMsg {
    return {
        id: row.id || '',
        content: row.content || '',
        startDate: row.start_date ? formatDateTime(new Date(row.start_date)) : '',
        endDate: row.end_date ? formatDateTime(new Date(row.end_date)) : '',
        isBold: row.is_bold || false,
        highlightColor: row.highlight_color || '',
        textColor: row.text_color || '',
        isActive: row.is_active !== false,
    };
}
