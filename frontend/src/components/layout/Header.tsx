import React from 'react';
import { Layers, BarChart3, History, QrCode, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inventory' | 'analytics' | 'history';
  setActiveTab: (tab: 'inventory' | 'analytics' | 'history') => void;
  lowStockCount: number;
  onOpenScanner: () => void;
  activeFolderName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  onOpenScanner,
  activeFolderName = 'Pastel Colour',
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('inventory')}>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md shadow-slate-900/10 flex items-center justify-center p-0.5 shrink-0">
              <img
                src="/logo.png"
                alt="Shiv Laminate"
                className="h-full w-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  SHIV <span className="text-sky-600">LAMINATE</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {activeFolderName}
                </span>
              </div>
              {/* <p className="text-[11px] text-slate-500 hidden sm:block">Single Owner Stock Management</p> */}
            </div>
          </div>

          {/* Navigation View Switcher */}
          <nav className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-white text-sky-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Stock</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-white text-sky-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-sky-700 font-bold shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Ledger</span>
            </button>
          </nav>

          {/* Actions & Utilities */}
          <div className="flex items-center space-x-2">
            {/* Low stock badge */}
            {lowStockCount > 0 && (
              <div
                title={`${lowStockCount} items below minimum threshold`}
                className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{lowStockCount} Low</span>
              </div>
            )}

            {/* Quick Barcode Scanner Button */}
            <button
              onClick={onOpenScanner}
              title="Scan Sheet QR or Barcode"
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 border border-slate-200 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              <span className="hidden lg:inline">Scan QR</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
