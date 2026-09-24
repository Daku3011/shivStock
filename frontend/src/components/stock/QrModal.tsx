import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Printer, Download } from 'lucide-react';
import { LaminateItem } from '../../types';

interface QrModalProps {
  item: LaminateItem | null;
  onClose: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({ item, onClose }) => {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!item) return;
    QRCode.toDataURL(
      item.sku,
      {
        width: 256,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setDataUrl(url);
        }
      }
    );
  }, [item]);

  if (!item) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `QR-${item.sku}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-xl p-6 relative text-center">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 mb-1">Sheet QR Label</h3>
        <p className="text-xs text-slate-500 mb-5">
          Scan to quickly add or remove stock from warehouse
        </p>

        {/* Printable Label Box */}
        <div id="printable-label" className="bg-slate-50 border border-slate-200 p-5 rounded-2xl mx-auto shadow-inner text-slate-900">
          <div className="border-b border-dashed border-slate-300 pb-2 mb-3">
            <div className="flex items-center space-x-2 mb-1">
              <img src="/logo.png" alt="Shiv Laminate" className="h-6 w-auto rounded bg-black px-1 py-0.5 object-contain" />
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">
                SHIV LAMINATE &bull; {item.category || 'COLLECTION'}
              </span>
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900">#{item.code}</div>
            <div className="text-xs font-bold text-sky-700 uppercase tracking-wider">{item.finish} {item.finish_name ? `- ${item.finish_name}` : ''}</div>
          </div>

          {dataUrl ? (
            <img src={dataUrl} alt={`QR for ${item.sku}`} className="w-48 h-48 mx-auto" />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-400">
              Generating QR...
            </div>
          )}

          <div className="pt-2 text-[11px] font-mono font-bold text-slate-700 border-t border-dashed border-slate-300 mt-2">
            SKU: {item.sku}
          </div>
        </div>

        <div className="flex items-center space-x-2 mt-5">
          <button
            onClick={handleDownload}
            className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-md shadow-sky-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print Label</span>
          </button>
        </div>
      </div>
    </div>
  );
};
