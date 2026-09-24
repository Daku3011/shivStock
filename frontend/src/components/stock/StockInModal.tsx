import React, { useState } from 'react';
import { X, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { LaminateItem } from '../../types';

interface StockInModalProps {
  item: LaminateItem | null;
  onClose: () => void;
  onSubmit: (itemId: string, quantity: number, reference: string, reason: string) => Promise<void>;
}

export const StockInModal: React.FC<StockInModalProps> = ({ item, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState<number>(5);
  const [reference, setReference] = useState<string>('Factory Batch Inward');
  const [reason, setReason] = useState<string>('Stock replenishment');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit(item.id, quantity, reference, reason);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const presets = [1, 5, 10, 20, 50];

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
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Add Stock (Inward)</h3>
            <p className="text-xs text-slate-500">
              {item.name} &bull; <span className="font-mono text-emerald-600">{item.sku}</span>
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
              <label className="text-xs font-semibold text-slate-700">Quantity to Add (Sheets)</label>
              <span className="text-xs text-slate-500">
                Current: <strong className="text-slate-900">{item.quantity}</strong> &rarr; New:{' '}
                <strong className="text-emerald-600">{item.quantity + (Number(quantity) || 0)}</strong>
              </span>
            </div>

            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-lg font-bold focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              required
            />

            {/* Quick preset chips */}
            <div className="flex items-center space-x-2 mt-2">
              {presets.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setQuantity(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    quantity === p
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  +{p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Supplier / Challan / Batch Reference
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. Shiv Factory Delivery #410"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Reason / Note</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Regular monthly restock"
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white outline-none"
            />
          </div>

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
              disabled={loading}
              className="flex-1 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'Adding...' : 'Confirm Inward'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
