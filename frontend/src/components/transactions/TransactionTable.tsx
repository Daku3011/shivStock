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
    <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Stock Movement Audit Ledger</h3>
          <p className="text-xs text-slate-500">Complete immutable record of all sheet adjustments</p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Type Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'ALL' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('IN')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'IN' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Inward (+)
            </button>
            <button
              onClick={() => setFilterType('OUT')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'OUT' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Outward (-)
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Refresh Ledger"
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors border border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">SKU / Item</th>
              <th className="py-3 px-4 text-center">Change</th>
              <th className="py-3 px-4 text-right">Balance</th>
              <th className="py-3 px-4">Reference / Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
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
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-600 font-mono whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formattedDate}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      {t.type === 'IN' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>INWARD</span>
                        </span>
                      ) : t.type === 'OUT' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                          <ArrowDownRight className="w-3 h-3" />
                          <span>OUTWARD</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold">
                          ADJUST
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {t.sku}
                    </td>

                    <td className="py-3 px-4 text-center font-bold text-sm">
                      <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPositive ? `+${t.quantity_change}` : t.quantity_change}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-600">
                      <span className="text-slate-400 font-normal">{t.previous_quantity} &rarr; </span>
                      <span className="text-slate-900 font-bold">{t.new_quantity}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-medium text-slate-900">{t.reference || '—'}</div>
                      <div className="text-[11px] text-slate-500">{t.reason || '—'}</div>
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
