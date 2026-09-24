import React from 'react';
import { Layers, BarChart3, History, QrCode, Lock, Unlock, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inventory' | 'analytics' | 'history';
  setActiveTab: (tab: 'inventory' | 'analytics' | 'history') => void;
  lowStockCount: number;
  onOpenScanner: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  onOpenScanner,
  isLocked,
  onToggleLock,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('inventory')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-white">
                  SHIV <span className="text-sky-400">LAMINATE</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Pastel Colour
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Single Owner Stock Management</p>
            </div>
          </div>

          {/* Navigation View Switcher */}
          <nav className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'inventory'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Stock</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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
                className="hidden md:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold animate-pulse"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{lowStockCount} Low</span>
              </div>
            )}

            {/* Quick Barcode Scanner Button */}
            <button
              onClick={onOpenScanner}
              title="Scan Sheet QR or Barcode"
              className="p-2 rounded-xl bg-slate-800 text-sky-400 hover:bg-slate-700 hover:text-sky-300 border border-slate-700 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden lg:inline">Scan QR</span>
            </button>

            {/* Lock / Unlock Toggle for single owner */}
            <button
              onClick={onToggleLock}
              title={isLocked ? 'Unlock system with PIN' : 'Lock system'}
              className={`p-2 rounded-xl border transition-colors ${
                isLocked
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
              }`}
            >
              {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
