'use client';
import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
    const scannerRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const internalOnScanSuccess = (decodedText: string) => {
            // we pause to avoid multiple scans
            if (scannerRef.current && html5QrCode.getState() === 2 /* SCANNING */) {
                scannerRef.current.pause(true);
            }
            onScanSuccess(decodedText);
        };

        html5QrCode.start(
            { facingMode: "environment" },
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
            },
            internalOnScanSuccess,
            onScanError
        ).catch((err) => {
            console.error("Camera start error:", err);
            if (onScanError) onScanError(err);
        });

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.stop().then(() => {
                        scannerRef.current?.clear();
                    }).catch(console.error);
                } catch (err) {
                    console.error("Error stopping scanner", err);
                }
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
            <div id="reader" className="w-full"></div>
            <style jsx global>{`
                #reader { border: none !important; }
                #reader__scan_region { background: #000; min-height: 250px; }
                #reader__dashboard_section_csr button {
                    background-color: #4f46e5 !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    font-weight: 500 !important;
                    cursor: pointer !important;
                    margin: 10px 5px !important;
                }
                #reader__dashboard_section_swaplink {
                    display: none !important;
                }
                #reader select {
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 15px;
                    width: 100%;
                    max-width: 300px;
                }
                #reader a { display: none !important; }
            `}</style>
        </div>
    );
}
