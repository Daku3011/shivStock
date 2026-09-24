import React from 'react';
import { Plus, Minus, QrCode, AlertCircle, ArrowDownRight, ArrowUpRight, MapPin } from 'lucide-react';
import { LaminateItem } from '../../types';

interface StockCardProps {
  item: LaminateItem;
  onStockIn: (item: LaminateItem) => void;
  onStockOut: (item: LaminateItem) => void;
  onQuickAdjust: (item: LaminateItem, delta: number) => void;
  onViewQr: (item: LaminateItem) => void;
  isLocked: boolean;
}

export const StockCard: React.FC<StockCardProps> = ({
  item,
  onStockIn,
  onStockOut,
  onQuickAdjust,
  onViewQr,
  isLocked,
}) => {
  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity > 0 && item.quantity <= item.min_threshold;

  return (
    <div
      className={`relative group bg-slate-900/90 rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-xl ${
        isOutOfStock
          ? 'border-rose-900/60 bg-gradient-to-b from-rose-950/20 to-slate-900'
          : isLowStock
          ? 'border-amber-700/60 bg-gradient-to-b from-amber-950/15 to-slate-900'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header Row: Finish Tag & QR Action */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 uppercase">
            {item.finish}
          </span>
          <span className="text-[11px] text-slate-400 font-medium truncate max-w-[130px]">
            {item.finish_name || item.category}
          </span>
        </div>

        <button
          onClick={() => onViewQr(item)}
          title="View QR Code Label"
          className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* Middle Row: Code & Current Sheets Count */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-white group-hover:text-sky-300 transition-colors">
            #{item.code}
          </span>
          <p className="text-[11px] font-mono text-slate-400 mt-0.5">{item.sku}</p>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end space-x-1">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                isOutOfStock
                  ? 'text-rose-400'
                  : isLowStock
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {item.quantity}
            </span>
            <span className="text-xs text-slate-400 font-semibold uppercase">sheets</span>
          </div>

          {/* Status Badge */}
          <div className="mt-1 flex items-center justify-end">
            {isOutOfStock ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                <AlertCircle className="w-3 h-3" />
                <span>Out of Stock</span>
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <AlertCircle className="w-3 h-3" />
                <span>Low ({item.quantity} &le; {item.min_threshold})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <span>In Stock</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Location tag if available */}
      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 mb-4 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800/80">
        <MapPin className="w-3 h-3 text-slate-400" />
        <span className="truncate">{item.location || 'Warehouse Main Rack'}</span>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
        {/* Quick Stock Out / Remove */}
        <div className="flex items-center space-x-1">
          <button
            disabled={isLocked || item.quantity <= 0}
            onClick={() => onQuickAdjust(item, -1)}
            title="Quick -1 Sheet"
            className="w-8 h-9 rounded-lg bg-slate-800 text-slate-300 hover:bg-rose-950/50 hover:text-rose-400 border border-slate-700/80 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={isLocked || item.quantity <= 0}
            onClick={() => onStockOut(item)}
            className="flex-1 h-9 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Out</span>
          </button>
        </div>

        {/* Quick Stock In / Add */}
        <div className="flex items-center space-x-1">
          <button
            disabled={isLocked}
            onClick={() => onStockIn(item)}
            className="flex-1 h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>In</span>
          </button>
          <button
            disabled={isLocked}
            onClick={() => onQuickAdjust(item, 1)}
            title="Quick +1 Sheet"
            className="w-8 h-9 rounded-lg bg-slate-800 text-slate-300 hover:bg-emerald-950/50 hover:text-emerald-400 border border-slate-700/80 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
