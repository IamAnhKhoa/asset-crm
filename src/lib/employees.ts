export const DEPARTMENT_NAMES: Record<string, string> = {
    "ban_giam_doc": "Ban Giám đốc",
    "phong_hanh_chinh_tai_chinh_nhan_su": "Phòng Hành chính - Tài chính - Nhân sự",
    "khoa_duoc_thiet_bi_y_te_can_lam_sang": "Khoa Dược - Thiết bị Y tế - Cận lâm sàng",
    "khoa_kham_benh_chua_benh": "Khoa Khám bệnh - Chữa bệnh",
    "khoa_phong_benh_an_toan_thuc_pham": "Khoa Phòng bệnh - An toàn Thực phẩm",
    "phong_dan_so_tre_em_bao_tro_xa_hoi": "Phòng Dân số - Trẻ em - Bảo trợ Xã hội"
};

export interface Employee {
    stt: number;
    ho_ten: string;
    chuc_danh: string;
    ghi_chu: string;
}

export const EMPLOYEES_DATA: Record<string, Employee[]> = {
    "ban_giam_doc": [
        { "stt": 1, "ho_ten": "Trương Tấn Hùng", "chuc_danh": "Giám đốc", "ghi_chu": "" },
        { "stt": 2, "ho_ten": "Trần Ngọc Tiến", "chuc_danh": "Phó Giám đốc", "ghi_chu": "Kiêm Trưởng phòng Hành chính, tài chính, nhân sự" },
        { "stt": 3, "ho_ten": "Mai Tuyết Thu", "chuc_danh": "Phó Giám đốc", "ghi_chu": "Kiêm Trưởng Khoa Dược, thiết bị y tế, cận lâm sàng" }
    ],
    "phong_hanh_chinh_tai_chinh_nhan_su": [
        { "stt": 1, "ho_ten": "Đặng Thị Nhanh", "chuc_danh": "Phó Trưởng phòng", "ghi_chu": "" },
        { "stt": 2, "ho_ten": "Trần Thị Thu Thảo", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 3, "ho_ten": "Lý Thị Ngọc Thúy", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 4, "ho_ten": "Lê Thị Huyền Đông", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 5, "ho_ten": "Trần Thị Ngọc Mến", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 6, "ho_ten": "Đặng Thị Liên", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 7, "ho_ten": "Lê Thanh Dũng", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 8, "ho_ten": "Trần Anh Khoa", "chuc_danh": "", "ghi_chu": "" }
    ],
    "khoa_duoc_thiet_bi_y_te_can_lam_sang": [
        { "stt": 1, "ho_ten": "Huỳnh Thanh Danh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 2, "ho_ten": "Lê Thị Dịu Linh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 3, "ho_ten": "Huỳnh Thị Thùy Dung", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 4, "ho_ten": "Hoàng Thị Ngọc Liên", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 5, "ho_ten": "Nguyễn Thị Giang", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 6, "ho_ten": "Nguyễn Thanh Tùng", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 7, "ho_ten": "Nguyễn Ngọc Hồng Hạnh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 8, "ho_ten": "Phan Thị Ái Phương", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 9, "ho_ten": "Nguyễn Thị Thùy Dưỡng", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 10, "ho_ten": "Trương Thị Mỹ Linh", "chuc_danh": "", "ghi_chu": "" }
    ],
    "khoa_kham_benh_chua_benh": [
        { "stt": 1, "ho_ten": "Trần Thị Huyền Hoa", "chuc_danh": "Trưởng Khoa", "ghi_chu": "" },
        { "stt": 2, "ho_ten": "Huỳnh Thị Mỹ Lan", "chuc_danh": "Phó Trưởng Khoa", "ghi_chu": "" },
        { "stt": 3, "ho_ten": "Nguyễn Hoàng Thắng", "chuc_danh": "Phó Trưởng Khoa", "ghi_chu": "" },
        { "stt": 4, "ho_ten": "Huỳnh Thị Hiền", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 5, "ho_ten": "Phan Thị Trường An", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 6, "ho_ten": "Trần Thị Diễm", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 7, "ho_ten": "Nguyễn Ngọc Dũng", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 8, "ho_ten": "Nguyễn Văn Minh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 9, "ho_ten": "Trần Văn Thành", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 10, "ho_ten": "Công Tằng Tôn Nữ Thị Thanh Xuân", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 11, "ho_ten": "Nguyễn Thị Mộng Nghi", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 12, "ho_ten": "Hồ Thị Thùy Linh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 13, "ho_ten": "Nguyễn Ngọc Châu", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 14, "ho_ten": "Trần Thị Hồng Yến", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 15, "ho_ten": "Nguyễn Thị Phương Dung", "chuc_danh": "", "ghi_chu": "" }
    ],
    "khoa_phong_benh_an_toan_thuc_pham": [
        { "stt": 1, "ho_ten": "Tô Thị Mỵ Trang", "chuc_danh": "Trưởng Khoa", "ghi_chu": "" },
        { "stt": 2, "ho_ten": "Nguyễn Thị Diễm Thúy", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 3, "ho_ten": "Cao Xuân Hiển", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 4, "ho_ten": "Bùi Thị Ngọc Minh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 5, "ho_ten": "Trang Thị Mộng Tuyền", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 6, "ho_ten": "Trương Thanh Thanh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 7, "ho_ten": "Nguyễn Thị Thùy Dung", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 8, "ho_ten": "Lê Như Lộc", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 9, "ho_ten": "Tăng Phi Long", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 10, "ho_ten": "Đặng Thị Thanh Vân", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 11, "ho_ten": "Trần Thị Vân Anh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 12, "ho_ten": "Huỳnh Công Minh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 13, "ho_ten": "Cao Thị Tuyết Mai", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 14, "ho_ten": "Nguyễn Ái Diễm", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 15, "ho_ten": "Trần Thị Ngọc Yến", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 16, "ho_ten": "Lý Thị Linh", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 17, "ho_ten": "Lê Thanh Tùng", "chuc_danh": "", "ghi_chu": "" }
    ],
    "phong_dan_so_tre_em_bao_tro_xa_hoi": [
        { "stt": 1, "ho_ten": "Võ Nguyễn Lệ Tâm", "chuc_danh": "Trưởng Phòng", "ghi_chu": "" },
        { "stt": 2, "ho_ten": "Cao Thị Thùy Vân", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 3, "ho_ten": "Nguyễn Lê Bích Ngọc", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 4, "ho_ten": "Nguyễn Thị Liễu", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 5, "ho_ten": "Nguyễn Cẩm Tú", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 6, "ho_ten": "Nguyễn Thị Kim Thúy", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 7, "ho_ten": "Nguyễn Thị Kim Chi", "chuc_danh": "", "ghi_chu": "" },
        { "stt": 8, "ho_ten": "Lê Thị Phương Trinh", "chuc_danh": "", "ghi_chu": "" }
    ]
};

export async function getDepartmentsAndEmployees() {
    return {
        departments: DEPARTMENT_NAMES,
        employees: EMPLOYEES_DATA,
    };
}
