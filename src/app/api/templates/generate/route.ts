import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import {
    Document, Packer, Paragraph, Table, TableRow, TableCell,
    TextRun, AlignmentType, WidthType, BorderStyle,
    TableLayoutType, VerticalAlign, UnderlineType,
} from 'docx';
import { DEPARTMENT_NAMES } from '@/lib/employees';

// ── Shared Helpers ────────────────────────────────────────────────────

const FONT = 'Times New Roman';

const NONE_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const SOLID = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const noBorder = () => ({ top: NONE_BORDER, bottom: NONE_BORDER, left: NONE_BORDER, right: NONE_BORDER });
const thinBorder = () => ({ top: SOLID, bottom: SOLID, left: SOLID, right: SOLID });

function t(
    text: string,
    opts: { bold?: boolean; italics?: boolean; size?: number; underline?: boolean } = {}
): TextRun {
    return new TextRun({
        text,
        bold: opts.bold,
        italics: opts.italics,
        size: opts.size ?? 28, // 14pt = 28 half-points (Vietnamese official doc standard)
        font: FONT,
        underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
    });
}

type Align = (typeof AlignmentType)[keyof typeof AlignmentType];

function p(
    runs: TextRun[],
    align: Align = AlignmentType.LEFT,
    spacingAfter = 120
): Paragraph {
    return new Paragraph({ alignment: align, spacing: { after: spacingAfter, line: 360 }, children: runs });
}

function blank(size = 120): Paragraph {
    return new Paragraph({ spacing: { after: size }, children: [] });
}

function noCell(paragraphs: Paragraph[], pct: number): TableCell {
    return new TableCell({
        borders: noBorder(), verticalAlign: VerticalAlign.TOP, children: paragraphs,
        width: { size: pct, type: WidthType.PERCENTAGE }
    });
}

function dataCell(
    text: string,
    opts: { bold?: boolean; center?: boolean; width?: number } = {}
): TableCell {
    return new TableCell({
        borders: thinBorder(),
        verticalAlign: VerticalAlign.CENTER,
        width: opts.width !== undefined ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
        children: [p([t(text, { bold: opts.bold })], opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, 60)],
    });
}

// ── Vietnamese letterhead (Bordered Table) ──────────────────────────
// Matches the official format from the latest screenshot
function letterhead(phongBan: string = ''): (Paragraph | Table)[] {
    const readableName = DEPARTMENT_NAMES[phongBan.toLowerCase()] || phongBan;
    const deptLabel = readableName ? readableName.toUpperCase() : 'KHOA .........';

    const headerTable = new Table({
        layout: TableLayoutType.FIXED,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: noBorder(),
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        borders: noBorder(),
                        verticalAlign: VerticalAlign.CENTER,
                        children: [p([t('UBND XÃ TÂN AN HỘI')], AlignmentType.CENTER, 40)],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                        borders: noBorder(),
                        verticalAlign: VerticalAlign.CENTER,
                        children: [p([t('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', { bold: true })], AlignmentType.CENTER, 40)],
                        width: { size: 60, type: WidthType.PERCENTAGE },
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        borders: noBorder(),
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            p([t(deptLabel, { bold: true })], AlignmentType.CENTER, 20),
                            p([t('____________________')], AlignmentType.CENTER, 60),
                        ],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                        borders: noBorder(),
                        verticalAlign: VerticalAlign.CENTER,
                        children: [
                            p([t('Độc lập – Tự do – Hạnh phúc', { bold: true })], AlignmentType.CENTER, 20),
                            p([t('____________________')], AlignmentType.CENTER, 60),
                        ],
                        width: { size: 60, type: WidthType.PERCENTAGE },
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        borders: noBorder(),
                        verticalAlign: VerticalAlign.CENTER,
                        children: [p([], AlignmentType.CENTER, 0)],
                        width: { size: 40, type: WidthType.PERCENTAGE },
                    }),
                    new TableCell({
                        borders: noBorder(),
                        verticalAlign: VerticalAlign.CENTER,
                        children: [p([t('Tân An Hội, ngày       tháng       năm 2026', { italics: true, size: 26 })], AlignmentType.CENTER, 60)],
                        width: { size: 60, type: WidthType.PERCENTAGE },
                    }),
                ],
            }),
        ],
    });

    return [headerTable, blank(120)];
}

function docTitle(title: string): Paragraph {
    return p([t(title, { bold: true, size: 28 })], AlignmentType.CENTER, 60);
}

function subTitle(sub: string): Paragraph {
    return p([t(sub, { italics: true, size: 24 })], AlignmentType.CENTER, 200);
}

function heading(h: string): Paragraph {
    return p([t(h, { bold: true })], AlignmentType.LEFT, 80);
}

function line(text: string, after = 80): Paragraph {
    return p([t(text)], AlignmentType.LEFT, after);
}

// Signature block – single-row borderless table
function signBlock(items: Array<{ top: string; sub?: string }>): Table {
    const pct = Math.floor(100 / items.length);
    const cols = items.map(item =>
        noCell([
            p([t(item.top, { bold: true })], AlignmentType.CENTER, 40),
            p([t(item.sub ?? '(Ký, ghi rõ họ tên)', { italics: true, size: 22 })], AlignmentType.CENTER, 280),
        ], pct)
    );
    return new Table({
        layout: TableLayoutType.FIXED,
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: cols })],
    });
}

const SECTION_OPTIONS = {
    page: {
        margin: {
            top: 1000,
            bottom: 1000,
            left: 1700,
            right: 1100,
        },
    },
};

// ─────────────────────────────────────────────────────────────────────
// 1. BẢNG ĐỀ XUẤT SỬA CHỮA
// ─────────────────────────────────────────────────────────────────────
function buildDeXuatSuaChua(userData: { phongBan: string; tenChon: string }): Document {
    const readableName = DEPARTMENT_NAMES[userData.phongBan.toLowerCase()] || userData.phongBan;
    const deptLabel = readableName || '...........';
    const signerLabel = readableName ? readableName.toUpperCase() : 'KHOA.........................';

    return new Document({
        sections: [{
            properties: SECTION_OPTIONS,
            children: [
                ...letterhead(userData.phongBan),
                docTitle('BẢNG ĐỀ XUẤT'),
                subTitle('V/v đề xuất sửa chữa tài sản'),

                line('Kính gửi: Phòng Hành chính – Tài chính – Nhân sự', 120),
                line('Hiện tại ..................................................................................................', 80),
                line('.......................................................................................................', 80),
                line(`Nay khoa/phòng ${deptLabel} đề xuất sửa chữa với nội dung như sau:`, 120),

                new Table({
                    layout: TableLayoutType.FIXED,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [dataCell('STT', { bold: true, center: true, width: 10 }), dataCell('NỘI DUNG', { bold: true, center: true, width: 50 }), dataCell('ĐVT', { bold: true, center: true, width: 20 }), dataCell('SỐ LƯỢNG', { bold: true, center: true, width: 20 })] }),
                        ...[1, 2, 3].map(i => new TableRow({ children: [dataCell(i.toString(), { center: true }), dataCell(''), dataCell('', { center: true }), dataCell('', { center: true })] })),
                    ],
                }),

                blank(120),
                line('Kính trình Hành chính – Tài chính – Nhân sự xem xét.', 200),

                signBlock([{ top: signerLabel, sub: userData.tenChon || '(Ký, ghi rõ họ tên)' }]),
            ],
        }],
    });
}

// ─────────────────────────────────────────────────────────────────────
// 2. BIÊN BẢN BÀN GIAO TÀI SẢN – CHIỀU ĐI (BÊN GIAO)
// ─────────────────────────────────────────────────────────────────────
function buildBanGiaoChieuDi(userData: { phongBan: string; tenChon: string }): Document {
    const readableName = DEPARTMENT_NAMES[userData.phongBan.toLowerCase()] || userData.phongBan;

    return new Document({
        sections: [{
            properties: SECTION_OPTIONS,
            children: [
                ...letterhead(userData.phongBan),
                docTitle('BIÊN BẢN BÀN GIAO TÀI SẢN'),
                subTitle('(Bên Giao)'),

                line('Hôm nay, ngày       tháng       năm 2026, tại Trạm Y tế Tân An Hội, chúng tôi gồm:', 120),

                heading('A. BÊN GIAO (Bên A):'),
                line(`Đơn vị: Trạm Y tế Tân An Hội        Phòng/Khoa: ${readableName || '.............................'}`, 80),
                line(`Đại diện: ${userData.tenChon || '................................................................'}  Chức vụ: ..................................`, 80),
                line('CMND/CCCD: ............................  Cấp ngày: ...............................  Tại: .......................', 120),

                heading('B. BÊN NHẬN (Bên B):'),
                line('Họ và tên / Tên đơn vị nhận: ..........................................................................................', 80),
                line('Đại diện: ................................................................  Chức vụ: ..................................', 80),
                line('Địa chỉ: .............................................................................................................', 120),

                heading('C. NỘI DUNG TÀI SẢN BÀN GIAO:'),

                new Table({
                    layout: TableLayoutType.FIXED,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [dataCell('STT', { bold: true, center: true, width: 8 }), dataCell('Tên tài sản', { bold: true, width: 26 }), dataCell('Mã TS', { bold: true, center: true, width: 12 }), dataCell('ĐVT', { bold: true, center: true, width: 10 }), dataCell('SL', { bold: true, center: true, width: 8 }), dataCell('Hiện trạng khi giao', { bold: true, width: 18 }), dataCell('Ghi chú', { bold: true, width: 18 })] }),
                        ...[1, 2, 3, 4, 5].map(i => new TableRow({ children: [dataCell(i.toString(), { center: true }), dataCell(''), dataCell('', { center: true }), dataCell('', { center: true }), dataCell('', { center: true }), dataCell(''), dataCell('')] })),
                    ],
                }),

                blank(100),
                line('Ghi chú khác: ...........................................................................................................', 80),
                line('Hai bên xác nhận nội dung biên bản là đúng. Biên bản lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.', 200),

                signBlock([
                    { top: 'BÊN GIAO', sub: userData.tenChon || '(Ký, ghi rõ họ tên)' },
                    { top: 'BÊN NHẬN', sub: '(Ký, ghi rõ họ tên)' },
                    { top: 'PHỤ TRÁCH ĐƠN VỊ', sub: '(Ký, đóng dấu)' },
                ]),
            ],
        }],
    });
}

// ─────────────────────────────────────────────────────────────────────
// 3. BIÊN BẢN TIẾP NHẬN TÀI SẢN – CHIỀU NHẬN (BÊN NHẬN)
// ─────────────────────────────────────────────────────────────────────
function buildBanGiaoChieuNhan(userData: { phongBan: string; tenChon: string }): Document {
    const readableName = DEPARTMENT_NAMES[userData.phongBan.toLowerCase()] || userData.phongBan;

    return new Document({
        sections: [{
            properties: SECTION_OPTIONS,
            children: [
                ...letterhead(userData.phongBan),
                docTitle('BIÊN BẢN TIẾP NHẬN TÀI SẢN'),
                subTitle('(Bên Nhận)'),

                line('Hôm nay, ngày       tháng       năm 2026, tại Trạm Y tế Tân An Hội, chúng tôi gồm:', 120),

                heading('A. BÊN GIAO (Bên A):'),
                line('Họ và tên / Tên đơn vị giao: ..........................................................................................', 80),
                line('Đại diện: ................................................................  Chức vụ: ..................................', 80),
                line('Địa chỉ: .............................................................................................................', 120),

                heading('B. BÊN NHẬN (Bên B):'),
                line(`Đơn vị: Trạm Y tế Tân An Hội        Phòng/Khoa: ${readableName || '.............................'}`, 80),
                line(`Đại diện: ${userData.tenChon || '................................................................'}  Chức vụ: ..................................`, 80),
                line('CMND/CCCD: ............................  Cấp ngày: ...............................  Tại: .......................', 120),

                heading('C. DANH MỤC TÀI SẢN TIẾP NHẬN:'),

                new Table({
                    layout: TableLayoutType.FIXED,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [dataCell('STT', { bold: true, center: true, width: 8 }), dataCell('Tên tài sản', { bold: true, width: 26 }), dataCell('Mã TS', { bold: true, center: true, width: 12 }), dataCell('ĐVT', { bold: true, center: true, width: 10 }), dataCell('SL', { bold: true, center: true, width: 8 }), dataCell('Hiện trạng khi nhận', { bold: true, width: 18 }), dataCell('Ghi chú', { bold: true, width: 18 })] }),
                        ...[1, 2, 3, 4, 5].map(i => new TableRow({ children: [dataCell(i.toString(), { center: true }), dataCell(''), dataCell('', { center: true }), dataCell('', { center: true }), dataCell('', { center: true }), dataCell(''), dataCell('')] })),
                    ],
                }),

                blank(100),
                heading('D. ĐÁNH GIÁ HIỆN TRẠNG KHI TIẾP NHẬN:'),
                line('  ☐  Tốt        ☐  Còn sử dụng được        ☐  Cần sửa chữa        ☐  Hư hỏng nặng', 80),
                line('Ghi chú: ...........................................................................................................', 200),

                line('Hai bên nhất trí ký tên xác nhận. Biên bản lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.', 200),

                signBlock([
                    { top: 'BÊN GIAO', sub: '(Ký, ghi rõ họ tên)' },
                    { top: 'BÊN NHẬN', sub: userData.tenChon || '(Ký, ghi rõ họ tên)' },
                    { top: 'PHỤ TRÁCH ĐƠN VỊ', sub: '(Ký, đóng dấu)' },
                ]),
            ],
        }],
    });
}

// ─────────────────────────────────────────────────────────────────────
// 4. PHIẾU NHẬN TÀI SẢN CÁ NHÂN
// ─────────────────────────────────────────────────────────────────────
function buildPhieuNhan(userData: { phongBan: string; tenChon: string }): Document {
    const readableName = DEPARTMENT_NAMES[userData.phongBan.toLowerCase()] || userData.phongBan;

    return new Document({
        sections: [{
            properties: SECTION_OPTIONS,
            children: [
                ...letterhead(userData.phongBan),
                docTitle('PHIẾU NHẬN TÀI SẢN'),
                subTitle('(Dùng cho cá nhân nhận giữ tài sản)'),

                heading('I. THÔNG TIN NGƯỜI NHẬN:'),
                line(`Họ và tên: ${userData.tenChon || '....................................................'}  Chức danh: .....................................`, 80),
                line(`Phòng / Khoa: ${readableName || '.................................................'}  Số điện thoại: ................................`, 80),
                line('CMND/CCCD số: .................  Cấp ngày: ........................  Tại: .................................', 120),

                heading('II. DANH SÁCH TÀI SẢN ĐƯỢC NHẬN:'),

                new Table({
                    layout: TableLayoutType.FIXED,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [dataCell('STT', { bold: true, center: true, width: 8 }), dataCell('Tên tài sản', { bold: true, width: 28 }), dataCell('Mã TS / Số Series', { bold: true, center: true, width: 20 }), dataCell('ĐVT', { bold: true, center: true, width: 10 }), dataCell('SL', { bold: true, center: true, width: 8 }), dataCell('Hiện trạng', { bold: true, width: 14 }), dataCell('Ghi chú', { bold: true, width: 12 })] }),
                        ...[1, 2, 3, 4].map(i => new TableRow({ children: [dataCell(i.toString(), { center: true }), dataCell(''), dataCell('', { center: true }), dataCell('', { center: true }), dataCell('', { center: true }), dataCell('Tốt'), dataCell('')] })),
                    ],
                }),

                blank(100),
                heading('III. CAM KẾT CỦA NGƯỜI NHẬN:'),
                line('Tôi đã nhận đủ các tài sản nêu trên và cam kết sử dụng đúng mục đích, bảo quản tốt và', 80),
                line('hoàn trả đầy đủ khi được yêu cầu hoặc khi chuyển công tác.', 200),

                signBlock([
                    { top: 'NGƯỜI GIAO TÀI SẢN', sub: '(Ký, ghi rõ họ tên)' },
                    { top: 'NGƯỜI NHẬN TÀI SẢN', sub: userData.tenChon || '(Ký, ghi rõ họ tên)' },
                ]),
            ],
        }],
    });
}

// ── ROUTE HANDLER ─────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const phongBan = (session.user as any).phongBan || '';
    const tenChon = (session.user as any).tenChon || '';
    const userData = { phongBan, tenChon };

    const id = req.nextUrl.searchParams.get('id');
    let doc: Document;
    let filename: string;

    switch (id) {
        case 'de-xuat-sua-chua': doc = buildDeXuatSuaChua(userData); filename = 'bang-de-xuat-sua-chua.docx'; break;
        case 'ban-giao-chieu-di': doc = buildBanGiaoChieuDi(userData); filename = 'bien-ban-ban-giao-chieu-di.docx'; break;
        case 'ban-giao-chieu-nhan': doc = buildBanGiaoChieuNhan(userData); filename = 'bien-ban-tiep-nhan-chieu-nhan.docx'; break;
        case 'phieu-nhan-tai-san': doc = buildPhieuNhan(userData); filename = 'phieu-nhan-tai-san.docx'; break;
        default: return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    }

    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(new Uint8Array(buffer), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}
