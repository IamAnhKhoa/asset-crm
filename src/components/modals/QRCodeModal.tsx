'use client';
import { QRCodeSVG } from 'qrcode.react';
import { useState, useRef } from 'react';
import { X, Download, Printer, QrCode } from 'lucide-react';

interface Props {
    assetId: string;
    assetName: string;
    location?: string;
    person?: string;
    year?: number | string;
    onClose: () => void;
}

export function QRCodeModal({ assetId, assetName, location, person, year, onClose }: Props) {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const lookupUrl = `${baseUrl}/lookup/${encodeURIComponent(assetId)}`;
    const svgRef = useRef<HTMLDivElement>(null);

    function handleDownload() {
        const svg = svgRef.current?.querySelector('svg');
        if (!svg) return;
        const canvas = document.createElement('canvas');
        const size = 400;
        canvas.width = size;
        canvas.height = size + 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, (size - 300) / 2, 20, 300, 300);

            // Text info
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 18px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Mã: ${assetId}`, size / 2, size - 10);

            ctx.font = '14px Inter, sans-serif';
            ctx.fillStyle = '#475569';
            ctx.fillText(assetName.substring(0, 45), size / 2, size + 15);

            // Detailed Info Block
            ctx.textAlign = 'left';
            ctx.font = '13px Inter, sans-serif';
            ctx.fillStyle = '#1e293b';
            let startY = size + 50;
            const x = 40;

            ctx.fillText(`Phòng: ${location || '...............'}`, x, startY);
            ctx.fillText(`Người giữ TS: ${person || '.....................'}`, x, startY + 25);
            ctx.fillText(`Năm KK: ${year || new Date().getFullYear()}`, x, startY + 50);
            ctx.fillText(`Người KK: ...........................................`, x, startY + 75);

            URL.revokeObjectURL(url);
            const a = document.createElement('a');
            a.download = `QR-${assetId}.png`;
            a.href = canvas.toDataURL('image/png');
            a.click();
        };
        img.src = url;
    }

    function handlePrint() {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const svg = svgRef.current?.querySelector('svg');
        if (!svg) return;
        const svgHtml = svg.outerHTML;
        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR - ${assetId}</title>
        <style>
          body { font-family: Inter, sans-serif; display: flex; flex-direction: column; align-items: center; min-height: 100vh; margin: 0; padding: 40px 20px; }
          .card { border: 1px solid #e2e8f0; padding: 24px; border-radius: 16px; width: 320px; text-align: center; }
          svg { width: 280px; height: 280px; margin: 0 auto; display: block; }
          .id { font-size: 20px; font-weight: 700; color: #1e293b; margin: 16px 0 4px; }
          .name { font-size: 14px; color: #475569; margin: 0 0 20px; text-align: center; font-weight: 500; }
          .info-block { text-align: left; margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
          .row { margin-bottom: 12px; font-size: 14px; color: #1e293b; line-height: 1.5; }
          .label { font-weight: 600; }
          .dots { color: #94a3b8; letter-spacing: 2px; }
        </style>
      </head>
      <body>
        <div class="card">
            ${svgHtml}
            <div class="id">Mã: ${assetId}</div>
            <div class="name">${assetName}</div>
            
            <div class="info-block">
                <div class="row"><span class="label">Phòng:</span> ${location || '<span class="dots">...........................</span>'}</div>
                <div class="row"><span class="label">Người giữ TS:</span> ${person || '<span class="dots">.....................</span>'}</div>
                <div class="row"><span class="label">Năm KK:</span> ${year || new Date().getFullYear()}</div>
                <div class="row"><span class="label">Người KK:</span> <span class="dots">...........................</span></div>
            </div>
        </div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
        printWindow.document.close();
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-panel max-w-sm">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <QrCode className="w-4.5 h-4.5 text-indigo-500" />
                        <h2 className="text-base font-semibold text-slate-900">Mã QR Tài Sản</h2>
                    </div>
                    <button onClick={onClose} className="btn-icon btn-ghost"><X className="w-4 h-4" /></button>
                </div>

                <div className="p-6 flex flex-col items-center gap-5">
                    {/* QR Code */}
                    <div ref={svgRef} className="p-4 bg-white rounded-2xl ring-1 ring-slate-200 shadow-sm">
                        <QRCodeSVG
                            value={lookupUrl}
                            size={240}
                            level="M"
                            includeMargin={false}
                            fgColor="#1e293b"
                            bgColor="#ffffff"
                            imageSettings={{
                                src: '',
                                width: 0,
                                height: 0,
                                excavate: false,
                            }}
                        />
                    </div>

                    {/* Info */}
                    <div className="text-center">
                        <p className="font-mono text-lg font-bold text-slate-800 tracking-wide">{assetId}</p>
                        <p className="text-sm text-slate-500 mt-0.5 max-w-[220px] truncate">{assetName}</p>
                    </div>

                    {/* URL */}
                    <div className="w-full bg-slate-50 rounded-xl px-3 py-2">
                        <p className="text-[10px] text-slate-400 mb-0.5">Link tra cứu</p>
                        <p className="text-xs text-slate-600 break-all font-mono">{lookupUrl}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                        <button onClick={handlePrint} className="flex-1 btn btn-secondary gap-2">
                            <Printer className="w-4 h-4" /> In
                        </button>
                        <button onClick={handleDownload} className="flex-1 btn-primary gap-2">
                            <Download className="w-4 h-4" /> Tải PNG
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
