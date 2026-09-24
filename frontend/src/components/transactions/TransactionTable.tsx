import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw, Filter, Calendar } from 'lucide-react';
import { StockTransaction } from '../../types';

interface TransactionTableProps {
  transactions: StockTransaction[];
  onRefresh: () => void;
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions, onRefresh }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = transactions.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Stock Movement Audit Ledger</h3>
          <p className="text-xs text-slate-400">Complete immutable record of all sheet adjustments</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Type Filter */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'ALL' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('IN')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'IN' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inward (+)
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'OUT' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Outward (-)
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Ledger"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">SKU / Item</th>
              <th className="py-3 px-4 text-center">Change</th>
              <th className="py-3 px-4 text-right">Balance</th>
              <th className="py-3 px-4">Reference / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No stock transactions found.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const isPositive = t.quantity_change > 0;
                const formattedDate = new Date(t.created_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 text-slate-300 font-mono whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {t.type === 'IN' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>INWARD</span>
                        </span>
                      ) : t.type === 'OUT' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>OUTWARD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold">
                          ADJUST
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {t.sku}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-sm">
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPositive ? `+${t.quantity_change}` : t.quantity_change}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-300">
                      <span className="text-slate-400 font-normal">{t.previous_quantity} &rarr; </span>
                      <span className="text-white font-bold">{t.new_quantity}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-medium text-white">{t.reference || '—'}</div>
                      <div className="text-[11px] text-slate-400">{t.reason || '—'}</div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
