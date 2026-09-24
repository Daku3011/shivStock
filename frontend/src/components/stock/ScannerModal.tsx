import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, Search, Camera, AlertCircle } from 'lucide-react';
import { LaminateItem } from '../../types';

interface ScannerModalProps {
  onClose: () => void;
  onItemFound: (item: LaminateItem) => void;
  items: LaminateItem[];
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ onClose, onItemFound, items }) => {
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'reader-viewport',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        handleMatch(decodedText);
      },
      () => {
        // Scanning frame without match
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const handleMatch = (text: string) => {
    const query = text.trim().toUpperCase();
    const found = items.find(
      (i) =>
        i.sku.toUpperCase() === query ||
        i.code === query ||
        query.includes(i.sku.toUpperCase())
    );

    if (found) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
      onItemFound(found);
      onClose();
    } else {
      setError(`No laminate item matched code "${text}".`);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleMatch(manualCode);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Scan Sheet Barcode / QR</h3>
            <p className="text-[11px] text-slate-400">Aim camera at sheet label</p>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Video stream container */}
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 mb-4">
          <div id="reader-viewport" className="w-full"></div>
        </div>

        {/* Manual lookup fallback */}
        <form onSubmit={handleManualSubmit} className="pt-2 border-t border-slate-800">
          <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">
            Or type SKU / Code manually:
          </label>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. SMT-1901 or 1903"
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-sky-500 outline-none uppercase"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-colors"
            >
              Lookup
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
