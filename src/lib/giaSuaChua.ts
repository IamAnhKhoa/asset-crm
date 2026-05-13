import { supabase } from './supabase';
import { formatDateTime } from './date-utils';

export interface ServiceItem {
    row: number;
    stt: string;
    loai: string;
    noiDung: string;
    donViTinh: string;
    donGia: number;
    ghiChu: string;
    ngayCapNhat: string;
}

// ── Sample data seeded when the table is empty ──
const SAMPLE_DATA: Omit<ServiceItem, 'row' | 'stt' | 'ngayCapNhat'>[] = [
    { loai: 'Bơm Mực Máy In', noiDung: 'Mực Bơm Laser', donViTinh: 'Hộp', donGia: 120000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Drum', donViTinh: 'Cây', donGia: 150000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Gạt', donViTinh: 'Cây', donGia: 100000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Trục Từ Sắt', donViTinh: 'Cây', donGia: 160000, ghiChu: '' },
    { loai: 'Bơm Mực Máy In', noiDung: 'Trục Từ Mủ', donViTinh: 'Cây', donGia: 100000, ghiChu: '' },
    { loai: 'Sửa Chữa Máy In', noiDung: 'Bộ Sấy', donViTinh: 'Bộ', donGia: 650000, ghiChu: '' },
    { loai: 'Sửa Chữa Máy In', noiDung: 'Bao Lụa', donViTinh: 'Bộ', donGia: 550000, ghiChu: '' },
    { loai: 'Sửa Chữa Máy In', noiDung: 'Rulo Ép', donViTinh: 'Cái', donGia: 500000, ghiChu: '' },
    { loai: 'Thiết Bị Mạng', noiDung: 'Đầu Mạng (RJ45)', donViTinh: 'Cái', donGia: 10000, ghiChu: '' },
    { loai: 'Thiết Bị Mạng', noiDung: 'Dây Mạng', donViTinh: 'Cái', donGia: 20000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Ổ Cứng SSD', donViTinh: 'Cái', donGia: 1700000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Nguồn Máy Tính', donViTinh: 'Cái', donGia: 700000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Bàn Phím Có Dây (USB)', donViTinh: 'Cái', donGia: 280000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Chuột Có Dây (USB)', donViTinh: 'Con', donGia: 250000, ghiChu: '' },
    { loai: 'Linh Kiện Vi Tính', noiDung: 'Fan CPU (Quạt Tản Nhiệt)', donViTinh: 'Cái', donGia: 180000, ghiChu: '' },
];

// ── Ensure seed data exists ──
export async function ensureSheetExists() {
    const { count } = await supabase
        .from('service_prices')
        .select('*', { count: 'exact', head: true });

    if (count === 0) {
        const now = new Date().toISOString();
        let currentLoai = '';
        let stt = 1;

        for (const item of SAMPLE_DATA) {
            if (item.loai !== currentLoai) {
                stt = 1;
                currentLoai = item.loai;
            }
            await supabase.from('service_prices').insert({
                stt: String(stt).padStart(2, '0'),
                loai: item.loai,
                noi_dung: item.noiDung,
                don_vi_tinh: item.donViTinh,
                don_gia: item.donGia,
                ghi_chu: item.ghiChu,
                ngay_cap_nhat: now,
            });
            stt++;
        }
    }
}

// ── CRUD ──
export async function getAllServices(): Promise<ServiceItem[]> {
    await ensureSheetExists();

    const { data, error } = await supabase
        .from('service_prices')
        .select('*')
        .order('loai', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('[GiaSuaChua] getAllServices error:', error.message);
        return [];
    }

    return (data || []).map(dbToService);
}

export async function addService(data: Omit<ServiceItem, 'row' | 'stt' | 'ngayCapNhat'>) {
    await ensureSheetExists();

    // Find next STT for this loai
    const { data: existing } = await supabase
        .from('service_prices')
        .select('stt')
        .eq('loai', data.loai);

    const stt = String((existing?.length || 0) + 1).padStart(2, '0');

    const { error } = await supabase.from('service_prices').insert({
        stt,
        loai: data.loai,
        noi_dung: data.noiDung,
        don_vi_tinh: data.donViTinh,
        don_gia: data.donGia,
        ghi_chu: data.ghiChu,
        ngay_cap_nhat: new Date().toISOString(),
    });

    if (error) {
        console.error('[GiaSuaChua] addService error:', error.message);
        return { success: false };
    }
    return { success: true };
}

export async function updateService(
    rowIndex: number,
    data: Omit<ServiceItem, 'row' | 'stt' | 'ngayCapNhat'>
) {
    const { error } = await supabase
        .from('service_prices')
        .update({
            loai: data.loai,
            noi_dung: data.noiDung,
            don_vi_tinh: data.donViTinh,
            don_gia: data.donGia,
            ghi_chu: data.ghiChu,
            ngay_cap_nhat: new Date().toISOString(),
        })
        .eq('id', rowIndex);

    if (error) {
        console.error('[GiaSuaChua] updateService error:', error.message);
        return { success: false };
    }
    return { success: true };
}

export async function deleteService(rowIndex: number) {
    const { error } = await supabase
        .from('service_prices')
        .delete()
        .eq('id', rowIndex);

    if (error) {
        console.error('[GiaSuaChua] deleteService error:', error.message);
        return { success: false };
    }
    return { success: true };
}

function dbToService(row: any): ServiceItem {
    return {
        row: row.id,
        stt: row.stt || '',
        loai: row.loai || '',
        noiDung: row.noi_dung || '',
        donViTinh: row.don_vi_tinh || '',
        donGia: Number(row.don_gia) || 0,
        ghiChu: row.ghi_chu || '',
        ngayCapNhat: row.ngay_cap_nhat ? formatDateTime(new Date(row.ngay_cap_nhat)) : '',
    };
}
