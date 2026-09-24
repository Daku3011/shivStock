import React, { useState } from 'react';
import { X, ArrowDownRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { LaminateItem } from '../../types';

interface StockOutModalProps {
  item: LaminateItem | null;
  onClose: () => void;
  onSubmit: (itemId: string, quantity: number, reference: string, reason: string) => Promise<void>;
}

export const StockOutModal: React.FC<StockOutModalProps> = ({ item, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [reference, setReference] = useState<string>('Client Order');
  const [reason, setReason] = useState<string>('Dispatched for site work');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }
    if (quantity > item.quantity) {
      setError(`Cannot dispatch ${quantity} sheets. Only ${item.quantity} sheets available in stock.`);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(item.id, quantity, reference, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch stock');
    } finally {
      setLoading(false);
    }
  };

  const presets = [1, 2, 5, 10];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
            <ArrowDownRight className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Remove Stock (Outward)</h3>
            <p className="text-xs text-slate-500">
              {item.name} &bull; <span className="font-mono text-rose-600">{item.sku}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Quantity to Dispatch (Sheets)</label>
              <span className="text-xs text-slate-500">
                Available: <strong className="text-slate-900">{item.quantity}</strong> &rarr; Remaining:{' '}
                <strong
                  className={
                    item.quantity - (Number(quantity) || 0) < 0
                      ? 'text-rose-600'
                      : 'text-amber-700'
                  }
                >
                  {Math.max(0, item.quantity - (Number(quantity) || 0))}
                </strong>
              </span>
            </div>

            <input
              type="number"
              min="1"
              max={item.quantity}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-lg font-bold focus:border-rose-500 focus:bg-white focus:ring-1 focus:ring-rose-500 outline-none transition-all"
              required
            />

            {/* Quick preset chips */}
            <div className="flex items-center space-x-2 mt-2">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p}
                  disabled={p > item.quantity}
                  onClick={() => setQuantity(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-30 disabled:pointer-events-none ${
                    quantity === p
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  -{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Client Name / Bill / Job Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Architect Patel Project / Cash Sale"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-rose-500 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Reason / Dispatch Note</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Wardrobe laminate dispatch"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-rose-500 focus:bg-white outline-none"
            />
          </div>

          {quantity > 0 && item.quantity - quantity <= item.min_threshold && (
            <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Notice: This dispatch will bring stock to or below the minimum reorder threshold!</span>
            </div>
          )}

          <div className="pt-2 flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || item.quantity <= 0}
              className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md shadow-rose-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Dispatching...' : 'Confirm Outward'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
