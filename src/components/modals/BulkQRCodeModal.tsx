'use client';
import { Asset } from '@/types';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { X, Printer, QrCode } from 'lucide-react';
import { createRoot } from 'react-dom/client';

interface Props {
    departments: string[];
    assets: Asset[];
    onClose: () => void;
}

export function BulkQRCodeModal({ departments, assets, onClose }: Props) {
    const [selectedDept, setSelectedDept] = useState<string>('');

    const filteredAssets = selectedDept
        ? assets.filter(a => a.location === selectedDept)
        : assets;

    function handlePrint() {
        if (filteredAssets.length === 0) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

        // Create a container to render all SVGs temporarily
        const tempContainer = document.createElement('div');
        document.body.appendChild(tempContainer);

        const root = createRoot(tempContainer);

        // Render all QR codes into the temp container
        root.render(
            <div style={{ display: 'none' }}>
                {filteredAssets.map(asset => (
                    <div key={asset.id} id={`qr-${asset.id}`}>
                        <QRCodeSVG
                            value={`${baseUrl}/lookup/${encodeURIComponent(asset.id)}`}
                            size={240}
                            level="M"
                            includeMargin={false}
                            fgColor="#1e293b"
                            bgColor="#ffffff"
                        />
                    </div>
                ))}
            </div>
        );

        // Wait for React to render the SVGs
        setTimeout(() => {
            // Build the print HTML
            let cardsHtml = '';
            filteredAssets.forEach(asset => {
                const svgElement = document.getElementById(`qr-${asset.id}`)?.querySelector('svg');
                const svgHtml = svgElement ? svgElement.outerHTML : '';
                cardsHtml += `
          <div class="card">
            ${svgHtml}
            <div class="id">Mã: ${asset.id}</div>
            <div class="name">${asset.name}</div>
            <div class="info-block">
              <div class="row"><span class="label">Phòng:</span> ${asset.location || '<span class="dots">...........................</span>'}</div>
              <div class="row"><span class="label">Người giữ TS:</span> ${asset.person || '<span class="dots">.....................</span>'}</div>
              <div class="row"><span class="label">Năm KK:</span> ${asset.year || new Date().getFullYear()}</div>
              <div class="row"><span class="label">Người KK:</span> <span class="dots">...........................</span></div>
            </div>
          </div>
        `;
            });

            const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>In QR Tài Sản - ${selectedDept || 'Tất cả'}</title>
          <style>
            body { 
              font-family: Inter, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #fff;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
            }
            .card { 
              border: 1px solid #000; 
              padding: 16px; 
              border-radius: 8px; 
              text-align: center; 
              page-break-inside: avoid;
            }
            svg { width: 160px; height: 160px; margin: 0 auto; display: block; }
            .id { font-size: 16px; font-weight: 700; color: #000; margin: 12px 0 4px; }
            .name { font-size: 12px; color: #333; margin: 0 0 12px; font-weight: 600; min-height: 28px; }
            .info-block { text-align: left; margin-top: 12px; border-top: 1px dashed #666; padding-top: 12px; }
            .row { margin-bottom: 8px; font-size: 12px; color: #000; line-height: 1.4; }
            .label { font-weight: 600; }
            .dots { color: #666; letter-spacing: 2px; }
            @media print {
              body { padding: 0; }
              .grid { gap: 10px; max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
        </html>
      `;

            printWindow.document.write(fullHtml);
            printWindow.document.close();

            // Cleanup
            root.unmount();
            document.body.removeChild(tempContainer);
        }, 500);
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel max-w-md">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-4.5 h-4.5 text-indigo-500" />
                        <h2 className="text-base font-semibold text-slate-900">In QR Code Hàng Loạt</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon btn-ghost"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div>
                        <label className="label">Chọn phòng ban để in in</label>
                        <select
                            className="select w-full"
                            value={selectedDept}
                            onChange={e => setSelectedDept(e.target.value)}
                        >
                            <option value="">-- Tất cả phòng ban --</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold text-slate-800 tracking-tight">
                            {filteredAssets.length}
                        </p>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            tài sản sẽ được in mã QR
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={onClose} className="btn-secondary">Hủy</button>
                        <button
                            onClick={handlePrint}
                            disabled={filteredAssets.length === 0}
                            className="btn-primary gap-2"
                        >
                            <Printer className="w-4 h-4" /> Bắt đầu In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
