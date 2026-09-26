import React from 'react';
import { Plus, Minus, QrCode, AlertCircle, ArrowDownRight, ArrowUpRight, MapPin, Trash2 } from 'lucide-react';
import { LaminateItem } from '../../types';

interface StockCardProps {
  item: LaminateItem;
  onStockIn: (item: LaminateItem) => void;
  onStockOut: (item: LaminateItem) => void;
  onQuickAdjust: (item: LaminateItem, delta: number) => void;
  onViewQr: (item: LaminateItem) => void;
  onDeleteItem?: (item: LaminateItem) => void;
}

export const StockCard: React.FC<StockCardProps> = ({
  item,
  onStockIn,
  onStockOut,
  onQuickAdjust,
  onViewQr,
  onDeleteItem,
}) => {
  const isOutOfStock = item.quantity === 0;
  const isLowStock = item.quantity > 0 && item.quantity <= item.min_threshold;

  return (
    <div
      className={`relative group bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-200 hover:shadow-md ${
        isOutOfStock
          ? 'border-rose-200 bg-rose-50/20'
          : isLowStock
          ? 'border-amber-200 bg-amber-50/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header Row: Finish Tag & QR Action */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider bg-sky-50 text-sky-700 border border-sky-200 uppercase">
            {item.finish}
          </span>
          <span className="text-[11px] text-slate-500 font-medium truncate max-w-[130px]">
            {item.finish_name || item.category}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onViewQr(item)}
            title="View QR Code Label"
            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            <QrCode className="w-4 h-4" />
          </button>
          {onDeleteItem && (
            <button
              onClick={() => onDeleteItem(item)}
              title="Delete Sheet from Catalog"
              className="p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Middle Row: Code & Current Sheets Count */}
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 group-hover:text-sky-700 transition-colors">
            #{item.code}
          </span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="text-[11px] font-mono text-slate-500">{item.sku}</span>
            {item.category && (
              <span className="text-[10px] font-medium text-slate-400">&bull; {item.category}</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-baseline justify-end space-x-1">
            <span
              className={`text-2xl sm:text-3xl font-black ${
                isOutOfStock
                  ? 'text-rose-600'
                  : isLowStock
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {item.quantity}
            </span>
            <span className="text-xs text-slate-500 font-semibold uppercase">sheets</span>
          </div>

          {/* Status Badge */}
          <div className="mt-1 flex items-center justify-end">
            {isOutOfStock ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                <AlertCircle className="w-3 h-3" />
                <span>Out of Stock</span>
              </span>
            ) : isLowStock ? (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <AlertCircle className="w-3 h-3" />
                <span>Low ({item.quantity} &le; {item.min_threshold})</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <span>In Stock</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Location tag if available */}
      <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 mb-4 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
        <MapPin className="w-3 h-3 text-slate-400" />
        <span className="truncate">{item.location || 'Warehouse Main Rack'}</span>
      </div>

      {/* Action Controls */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        {/* Quick Stock Out / Remove */}
        <div className="flex items-center space-x-1">
          <button
            disabled={item.quantity <= 0}
            onClick={() => onQuickAdjust(item, -1)}
            title="Quick -1 Sheet"
            className="w-8 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={item.quantity <= 0}
            onClick={() => onStockOut(item)}
            className="flex-1 h-9 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center space-x-1 transition-colors disabled:opacity-40 disabled:pointer-events-none active:scale-95"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Out</span>
          </button>
        </div>

        {/* Quick Stock In / Add */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onStockIn(item)}
            className="flex-1 h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center justify-center space-x-1 transition-colors active:scale-95"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>In</span>
          </button>
          <button
            onClick={() => onQuickAdjust(item, 1)}
            title="Quick +1 Sheet"
            className="w-8 h-9 rounded-lg bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 flex items-center justify-center transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
