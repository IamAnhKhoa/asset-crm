'use client';
import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanError?: (error: any) => void;
}

export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // html5-qrcode requires a div with a specific ID to mount
        scannerRef.current = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0,
                showTorchButtonIfSupported: true,
            },
            /* verbose= */ false
        );

        const internalOnScanSuccess = (decodedText: string) => {
            // we pause or clear to avoid multiple scans
            if (scannerRef.current) {
                scannerRef.current.pause(true);
            }
            onScanSuccess(decodedText);
        };

        scannerRef.current.render(internalOnScanSuccess, onScanError);

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
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
